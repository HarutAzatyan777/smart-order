const { randomUUID } = require("crypto");
const { db } = require("../../admin");
const {
  FieldValue,
  FieldPath,
  Timestamp
} = require("firebase-admin/firestore");
const { resolveStationForItem } = require("./stationsService");

const ITEM_STATUSES = ["queued", "preparing", "ready", "delivered"];
const ITEM_STATUS_SET = new Set(ITEM_STATUSES);

const stripUndefined = (obj = {}) => {
  const clean = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) clean[key] = obj[key];
  });
  return clean;
};

const timestampFieldForStatus = (status) =>
  ({
    preparing: "preparingAt",
    ready: "readyAt",
    delivered: "deliveredAt"
  }[status] || null);

const applyStatusTimestamps = (item, status, now) => {
  const next = { ...item };

  if (!status) return next;

  if (status === "queued") {
    if (!next.queuedAt) next.queuedAt = now;
  }

  if (status === "preparing") {
    if (!next.queuedAt) next.queuedAt = now;
    if (!next.preparingAt) next.preparingAt = now;
  }

  if (status === "ready") {
    if (!next.queuedAt) next.queuedAt = now;
    if (!next.preparingAt) next.preparingAt = item.preparingAt || now;
    if (!next.readyAt) next.readyAt = now;
    next.prepTimeMs =
      next.preparingAt && next.readyAt
        ? next.readyAt.toMillis
          ? next.readyAt.toMillis() - next.preparingAt.toMillis()
          : next.readyAt - next.preparingAt
        : null;
  }

  if (status === "delivered") {
    if (!next.queuedAt) next.queuedAt = now;
    if (!next.preparingAt) next.preparingAt = item.preparingAt || null;
    if (!next.readyAt) next.readyAt = item.readyAt || null;
    if (!next.deliveredAt) next.deliveredAt = now;
    if (!next.prepTimeMs && next.preparingAt && next.readyAt) {
      next.prepTimeMs =
        next.readyAt.toMillis
          ? next.readyAt.toMillis() - next.preparingAt.toMillis()
          : next.readyAt - next.preparingAt;
    }
  }

  return next;
};

const deriveOrderStatus = (items = []) => {
  if (!items.length) return "new";
  const statuses = items.map((i) => i?.status || "queued");

  const allQueued = statuses.every((s) => s === "queued");
  const anyPreparing = statuses.includes("preparing");
  const allReadyOrDelivered = statuses.every((s) => s === "ready" || s === "delivered");
  const allDelivered = statuses.every((s) => s === "delivered");

  if (allDelivered) return "delivered";
  if (allReadyOrDelivered) return "ready";
  if (anyPreparing) return "preparing";
  if (allQueued) return "new";
  // Mixed queued/ready/delivered but nothing preparing -> still active
  return "preparing";
};

const buildItemsWithStations = (
  rawItems = [],
  { table, routingConfig, stationsMap, stationResolver } = {}
) => {
  const now = Timestamp.now();
  const resolver =
    stationResolver ||
    ((item) => resolveStationForItem(item, routingConfig || {}, stationsMap || {}));

  return rawItems.map((item, idx) => {
    const qty = Math.max(1, Number(item?.qty) || 1);
    const status = ITEM_STATUS_SET.has(item?.status) ? item.status : "queued";
    const station = resolver ? resolver(item) : item.station || null;

    return {
      itemId: item.itemId || item.id || randomUUID(),
      name: item.name || `Item ${idx + 1}`,
      qty,
      status,
      station: station || null,
      category: item.category || null,
      menuId: item.menuId || item.id || null,
      assignedChefId: item.assignedChefId || null,
      assignedChefName: item.assignedChefName || null,
      batchId: item.batchId || null,
      notes: item.notes || "",
      table: table || null,
      createdAt: now,
      updatedAt: now
    };
  });
};

const createOrderWithItems = async (
  payload = {},
  { routingConfig, stationsMap, stationResolver } = {}
) => {
  const now = Timestamp.now();

  const items = buildItemsWithStations(payload.items || [], {
    table: payload.table,
    routingConfig,
    stationsMap,
    stationResolver
  });

  const status = deriveOrderStatus(items);
  const orderRef = payload.orderRef || db.collection("orders").doc();

  const orderData = {
    table: payload.table,
    tableNumber: payload.table,
    tableId: payload.tableId || null,
    waiterName: payload.waiterName || "Waiter",
    waiterId: payload.waiterId || null,
    notes: payload.notes || "",
    status,
    items,
    createdAt: now,
    updatedAt: now,
    timestamps: {
      acceptedAt: null,
      preparingAt: null,
      readyAt: null,
      deliveredAt: null,
      closedAt: null,
      cancelledAt: null
    }
  };

  const batch = db.batch();
  batch.set(orderRef, orderData);

  items.forEach((item) => {
    const itemRef = db.collection("kitchenItems").doc(item.itemId);
    const itemPayload = {
      ...item,
      queuedAt: item.createdAt || now,
      orderId: orderRef.id,
      table: payload.table,
      tableId: payload.tableId || null,
      active: true,
      orderStatus: status,
      orderCreatedAt: now
    };
    batch.set(itemRef, stripUndefined(itemPayload));
  });

  await batch.commit();

  return { id: orderRef.id, status, items };
};

const updateItems = async (itemIds = [], options = {}, meta = {}) => {
  const {
    status,
    assignedChefId,
    assignedChefName,
    batchId,
    expectedStation
  } = options;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { updated: 0 };
  }

  if (status && !ITEM_STATUS_SET.has(status)) {
    throw new Error("Invalid item status");
  }

  const hasAssignmentChange =
    assignedChefId !== undefined || assignedChefName !== undefined || batchId !== undefined;

  if (!status && !hasAssignmentChange) {
    return { updated: 0 };
  }

  const ids = Array.from(
    new Set(
      itemIds
        .filter(Boolean)
        .map((id) => String(id).trim())
        .filter(Boolean)
    )
  );

  if (ids.length === 0) return { updated: 0 };

  const now = Timestamp.now();
  const itemDocs = [];
  const updatesByOrder = new Map();

  const allowedStations = Array.isArray(expectedStation)
    ? expectedStation.filter(Boolean)
    : expectedStation
    ? [expectedStation]
    : null;

  const chunkSize = 10; // Firestore "in" limit
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const snap = await db
      .collection("kitchenItems")
      .where(FieldPath.documentId(), "in", chunk)
      .get();

    snap.docs.forEach((doc) => {
      const data = doc.data() || {};
      if (allowedStations && !allowedStations.includes(data.station)) {
        return;
      }
      const orderId = data.orderId;
      if (!orderId) return;
      itemDocs.push({ doc, data });
      if (!updatesByOrder.has(orderId)) updatesByOrder.set(orderId, new Set());
      updatesByOrder.get(orderId).add(doc.id);
    });
  }

  const orderStatusMap = new Map();
  const auditEntries = [];

  for (const [orderId, idSet] of updatesByOrder.entries()) {
    const orderRef = db.collection("orders").doc(orderId);
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { changed: false };

      const data = snap.data() || {};
      const items = Array.isArray(data.items) ? data.items.map((i) => ({ ...i })) : [];

      let changed = false;
      const nextItems = items.map((item) => {
        if (!idSet.has(item.itemId)) return item;
        changed = true;
        let next = { ...item, updatedAt: now };
        if (status) next.status = status;
        if (meta.unclaim === true) {
          next.assignedChefId = null;
          next.assignedChefName = null;
          next.batchId = null;
        } else {
          if (assignedChefId !== undefined) next.assignedChefId = assignedChefId || null;
          if (assignedChefName !== undefined) next.assignedChefName = assignedChefName || null;
          if (batchId !== undefined) next.batchId = batchId || null;
        }
        next = applyStatusTimestamps(next, status, now);
        const before = { ...item };
        const nextWithTs = applyStatusTimestamps(next, status, now);
        auditEntries.push({
          orderId,
          itemId: item.itemId,
          before,
          after: nextWithTs
        });
        return nextWithTs;
      });

      if (!changed) return { changed: false };

      const derivedStatus = deriveOrderStatus(nextItems);
      const updatePayload = {
        items: nextItems,
        status: derivedStatus,
        updatedAt: now
      };

      const tsField = timestampFieldForStatus(derivedStatus);
      if (tsField && !(data.timestamps && data.timestamps[tsField])) {
        updatePayload[`timestamps.${tsField}`] = now;
      }

      tx.update(orderRef, updatePayload);

      return { changed: true, orderStatus: derivedStatus };
    });

    if (result.changed) {
      orderStatusMap.set(orderId, result.orderStatus);
    }
  }

  if (itemDocs.length) {
    const batch = db.batch();
    itemDocs.forEach(({ doc, data }) => {
      const basePayload = {
        updatedAt: now,
        orderStatus: orderStatusMap.get(data.orderId) || data.orderStatus || null
      };

      let nextItem = { ...data };
      if (status) nextItem.status = status;
      if (meta.unclaim === true) {
        nextItem.assignedChefId = null;
        nextItem.assignedChefName = null;
        nextItem.batchId = null;
      } else {
        if (assignedChefId !== undefined) nextItem.assignedChefId = assignedChefId || null;
        if (assignedChefName !== undefined) nextItem.assignedChefName = assignedChefName || null;
        if (batchId !== undefined) nextItem.batchId = batchId || null;
      }

      nextItem = applyStatusTimestamps(nextItem, status, now);

      if (status) basePayload.status = status;
      if (meta.unclaim === true) {
        basePayload.assignedChefId = null;
        basePayload.assignedChefName = null;
        basePayload.batchId = null;
      } else {
        if (assignedChefId !== undefined) basePayload.assignedChefId = assignedChefId || null;
        if (assignedChefName !== undefined) basePayload.assignedChefName = assignedChefName || null;
        if (batchId !== undefined) basePayload.batchId = batchId || null;
      }
      if (nextItem.preparingAt && !data.preparingAt) basePayload.preparingAt = nextItem.preparingAt;
      if (nextItem.readyAt && !data.readyAt) basePayload.readyAt = nextItem.readyAt;
      if (nextItem.deliveredAt && !data.deliveredAt) basePayload.deliveredAt = nextItem.deliveredAt;
      if (nextItem.prepTimeMs && !data.prepTimeMs) basePayload.prepTimeMs = nextItem.prepTimeMs;

      const updatePayload = stripUndefined(basePayload);

      batch.update(doc.ref, updatePayload);
    });
    await batch.commit();
  }

  if (auditEntries.length) {
    const auditRef = db.collection("kitchenAudit").doc();
    await auditRef.set(
      stripUndefined({
        itemIds: ids,
        status,
        assignedChefId,
        assignedChefName,
        batchId,
        expectedStation,
        autoUnclaimMs: meta.autoUnclaimMs || null,
        changes: auditEntries,
        createdAt: now
      })
    );
  }

  return { updated: itemDocs.length };
};

module.exports = {
  ITEM_STATUSES,
  deriveOrderStatus,
  buildItemsWithStations,
  createOrderWithItems,
  updateItems,
  timestampFieldForStatus
};
