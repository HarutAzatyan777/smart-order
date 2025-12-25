const express = require('express');
const router = express.Router();
const { db } = require('../../admin');
const { FieldValue, FieldPath, Timestamp } = require('firebase-admin/firestore');
const { updateItems } = require('../services/orderService');
const { listStations } = require('../services/stationsService');

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") {
    const ms = value.seconds * 1000 + (value.nanoseconds || 0) / 1_000_000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// ===============================
// STATION LIST (public)
// ===============================
router.get('/stations', async (_req, res) => {
  try {
    const stations = await listStations();
    res.status(200).send(stations);
  } catch (error) {
    console.error("Kitchen stations list error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// STATION QUEUE (item-level)
// ===============================
router.get('/stations/:slug/queue', async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.query;

    const statuses = status
      ? String(status)
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : ["queued", "preparing", "ready"];

    const snapshot = await db
      .collection("kitchenItems")
      .where("station", "==", slug)
      .get();

    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item) => item.active !== false && statuses.includes(item.status || "queued"));

    items.sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const tB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return tA - tB;
    });

    res.status(200).send({
      station: slug,
      items
    });
  } catch (error) {
    console.error("Kitchen queue error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// STATION METRICS (avg prep time)
// ===============================
router.get('/stations/:slug/metrics', async (req, res) => {
  try {
    const { slug } = req.params;
    const now = Date.now();

    const windows = {
      "15m": now - 15 * 60 * 1000,
      "1h": now - 60 * 60 * 1000,
      today: new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    };

    const minStart = new Date(Math.min(...Object.values(windows)));
    const snapshot = await db
      .collection("kitchenItems")
      .where("station", "==", slug)
      .where("readyAt", ">=", Timestamp.fromDate(minStart))
      .orderBy("readyAt", "desc")
      .limit(800)
      .get();

    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const queueSnap = await db
      .collection("kitchenItems")
      .where("station", "==", slug)
      .where("active", "==", true)
      .where("status", "in", ["queued", "preparing"])
      .get();

    const queueLength = queueSnap.size;

    const buildMetrics = (startMs) => {
      let sum = 0;
      let count = 0;
      const byItem = new Map();

      rows.forEach((row) => {
        const ready = toDate(row.readyAt);
        const prep = toDate(row.preparingAt);
        if (!ready || !prep) return;
        if (ready.getTime() < startMs) return;
        const diff = ready.getTime() - prep.getTime();
        if (diff <= 0) return;

        sum += diff;
        count += 1;

        const key = row.name || "Item";
        const entry = byItem.get(key) || { name: key, sum: 0, count: 0 };
        entry.sum += diff;
        entry.count += 1;
        byItem.set(key, entry);
      });

      const items = Array.from(byItem.values())
        .map((entry) => ({
          name: entry.name,
          avgPrepTimeMs: Math.round(entry.sum / entry.count),
          samples: entry.count
        }))
        .sort((a, b) => b.samples - a.samples);

      return {
        avgPrepTimeMs: count ? Math.round(sum / count) : null,
        samples: count,
        items
      };
    };

    const metrics = {
      "15m": buildMetrics(windows["15m"]),
      "1h": buildMetrics(windows["1h"]),
      today: buildMetrics(windows.today)
    };

    const pickWindow = metrics["15m"].samples ? metrics["15m"] : metrics["1h"];
    const baselineMs = 8 * 60 * 1000; // 8 minutes baseline
    let health = "healthy";
    if (queueLength > 12) {
      health = "critical";
    } else if (queueLength > 8) {
      health = "warning";
    }
    if (pickWindow.avgPrepTimeMs && pickWindow.avgPrepTimeMs > baselineMs * 1.5) {
      health = health === "critical" ? "critical" : "warning";
    }

    res.status(200).send({
      station: slug,
      windows: metrics,
      queueLength,
      health,
      baselineMs,
      rangeStart: minStart,
      generatedAt: new Date(now)
    });
  } catch (error) {
    console.error("Kitchen metrics error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// BATCH STATUS UPDATE (start/ready/complete)
// ===============================
router.patch('/stations/:slug/items/status', async (req, res) => {
  try {
    const { slug } = req.params;
    const { itemIds, status, chefId, chefName, batchId, timeoutMs } = req.body || {};

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).send({ error: "Missing itemIds" });
    }
    if (!status) {
      return res.status(400).send({ error: "Missing status" });
    }

    const result = await updateItems(
      itemIds,
      {
        status,
        assignedChefId: chefId,
        assignedChefName: chefName,
        batchId,
        expectedStation: slug
      },
      { autoUnclaimMs: timeoutMs }
    );

    res.status(200).send({
      updated: result.updated,
      status
    });
  } catch (error) {
    console.error("Kitchen batch status error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// CLAIM / ASSIGN CHEF WITHOUT STATUS CHANGE
// ===============================
router.patch('/stations/:slug/items/claim', async (req, res) => {
  try {
    const { slug } = req.params;
    const { itemIds, chefId, chefName, batchId } = req.body || {};

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).send({ error: "Missing itemIds" });
    }

    const result = await updateItems(itemIds, {
      assignedChefId: chefId,
      assignedChefName: chefName,
      batchId,
      expectedStation: slug
    });

    res.status(200).send({
      updated: result.updated,
      chefId,
      chefName
    });
  } catch (error) {
    console.error("Kitchen claim error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// UNCLAIM / RELEASE BATCH
// ===============================
router.patch('/stations/:slug/items/unclaim', async (req, res) => {
  try {
    const { slug } = req.params;
    const { itemIds, force } = req.body || {};

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).send({ error: "Missing itemIds" });
    }

    const snap = await db
      .collection("kitchenItems")
      .where(FieldPath.documentId(), "in", itemIds.slice(0, 10))
      .get();

    const blocked = snap.docs.some((doc) => {
      const data = doc.data() || {};
      return data.status === "ready" || data.status === "delivered";
    });

    if (blocked && !force) {
      return res.status(400).send({ error: "Cannot unclaim items that are ready/delivered." });
    }

    const result = await updateItems(
      itemIds,
      {
        assignedChefId: null,
        assignedChefName: null,
        batchId: null,
        status: "queued",
        expectedStation: slug
      },
      { unclaim: true }
    );

    res.status(200).send({
      updated: result.updated,
      message: "Batch unclaimed"
    });
  } catch (error) {
    console.error("Kitchen unclaim error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// GET → All NEW or ACTIVE orders
// ===============================
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    // Default shows "new" + "preparing"
    const statuses = status
      ? [status]
      : ["new", "preparing"];

    const snapshot = await db
      .collection("orders")
      .where("status", "in", statuses)
      .orderBy("createdAt", "asc") // kitchen sees oldest first
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).send(orders);

  } catch (error) {
    console.error("Kitchen Get Orders Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// PATCH → Mark as PREPARING
// ===============================
router.patch('/:id/preparing', async (req, res) => {
  try {
    const { id } = req.params;

    const orderDoc = await db.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    const itemIds = Array.isArray(orderDoc.data().items)
      ? orderDoc.data().items.map((i) => i?.itemId).filter(Boolean)
      : [];

    if (itemIds.length) {
      await updateItems(itemIds, { status: "preparing" });
    } else {
      await db.collection("orders").doc(id).update({
        status: "preparing",
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    res.status(200).send({
      id,
      status: "preparing",
      message: "Order marked as PREPARING"
    });

  } catch (error) {
    console.error("Kitchen Preparing Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// PATCH → Mark as READY
// ===============================
router.patch('/:id/ready', async (req, res) => {
  try {
    const { id } = req.params;

    const orderDoc = await db.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    const itemIds = Array.isArray(orderDoc.data().items)
      ? orderDoc.data().items.map((i) => i?.itemId).filter(Boolean)
      : [];

    if (itemIds.length) {
      await updateItems(itemIds, { status: "ready" });
    } else {
      await db.collection("orders").doc(id).update({
        status: "ready",
        readyAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    res.status(200).send({
      id,
      status: "ready",
      message: "Order marked as READY"
    });

  } catch (error) {
    console.error("Kitchen Ready Error:", error);
    res.status(500).send({ error: error.message });
  }
});

// ===============================
// PATCH → Cancel order
// ===============================
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    const orderDoc = await db.collection("orders").doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).send({ error: "Order not found" });
    }

    const itemIds = Array.isArray(orderDoc.data().items)
      ? orderDoc.data().items.map((i) => i?.itemId).filter(Boolean)
      : [];

    if (itemIds.length) {
      const chunkSize = 10;
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        const chunk = itemIds.slice(i, i + chunkSize);
        const snap = await db
          .collection("kitchenItems")
          .where(FieldPath.documentId(), "in", chunk)
          .get();
        const batch = db.batch();
        snap.docs.forEach((doc) => {
          batch.update(doc.ref, {
            active: false,
            orderStatus: "cancelled",
            updatedAt: FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }
    }

    await db.collection("orders").doc(id).update({
      status: "canceled",
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(200).send({
      id,
      status: "canceled",
      message: "Order CANCELED by kitchen"
    });

  } catch (error) {
    console.error("Kitchen Cancel Error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
