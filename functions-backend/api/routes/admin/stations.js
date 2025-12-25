const express = require('express');
const router = express.Router();
const {
  stationsCollection,
  listStations,
  normalizeSlug,
  getRoutingConfig,
  saveRoutingConfig,
  pruneRoutingForDeletion,
  backfillKitchenItems,
  softDeleteMigration
} = require('../../services/stationsService');
const { FieldValue } = require('firebase-admin/firestore');

// =========================
// LIST STATIONS
// =========================
router.get('/', async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "true";
    const stations = await listStations({ includeInactive });
    res.status(200).send(stations);
  } catch (error) {
    console.error("Admin list stations error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =========================
// CREATE STATION
// =========================
router.post('/', async (req, res) => {
  try {
    const {
      name,
      slug,
      color,
      active = true,
      batchingEnabled = true,
      multiChefEnabled = false,
      maxBatchSize = null
    } = req.body || {};

    if (!name) {
      return res.status(400).send({ error: "Name is required" });
    }

    const normalizedSlug = normalizeSlug(slug || name);
    if (!normalizedSlug) {
      return res.status(400).send({ error: "Slug is invalid" });
    }

    const slugExists = await stationsCollection.where("slug", "==", normalizedSlug).get();
    if (!slugExists.empty) {
      return res.status(400).send({ error: "Slug already in use" });
    }

    const docRef = await stationsCollection.add({
      name,
      slug: normalizedSlug,
      color: color || "#0f172a",
      active,
      batchingEnabled,
      multiChefEnabled,
      maxBatchSize: maxBatchSize || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).send({
      id: docRef.id,
      message: "Station created"
    });
  } catch (error) {
    console.error("Admin create station error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =========================
// UPDATE STATION
// =========================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const docRef = stationsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send({ error: "Station not found" });
    }

    if (updates.slug || updates.name) {
      const normalizedSlug = normalizeSlug(updates.slug || updates.name);
      if (!normalizedSlug) {
        return res.status(400).send({ error: "Slug is invalid" });
      }

      if (normalizedSlug !== doc.data().slug) {
        const slugExists = await stationsCollection.where("slug", "==", normalizedSlug).get();
        if (!slugExists.empty) {
          return res.status(400).send({ error: "Slug already in use" });
        }
        updates.slug = normalizedSlug;
      }
    }

    updates.updatedAt = FieldValue.serverTimestamp();

    await docRef.update(updates);

    res.status(200).send({
      id,
      message: "Station updated"
    });
  } catch (error) {
    console.error("Admin update station error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =========================
// DELETE STATION
// =========================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reassignTo = null } = req.body || {};

    const docRef = stationsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send({ error: "Station not found" });
    }

    const data = doc.data() || {};
    const slug = data.slug || normalizeSlug(data.name);

    await pruneRoutingForDeletion(slug, reassignTo || null);
    await docRef.delete();

    res.status(200).send({
      id,
      message: "Station deleted",
      reassignedTo: reassignTo || null
    });
  } catch (error) {
    console.error("Admin delete station error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =========================
// ROUTING CONFIG
// =========================
router.get('/routing/map', async (_req, res) => {
  try {
    const cfg = await getRoutingConfig();
    res.status(200).send(cfg);
  } catch (error) {
    console.error("Admin routing fetch error:", error);
    res.status(500).send({ error: error.message });
  }
});

router.put('/routing/map', async (req, res) => {
  try {
    const { categories = {}, items = {}, defaultStation = null } = req.body || {};
    const payload = await saveRoutingConfig({ categories, items, defaultStation });
    res.status(200).send({ message: "Routing updated", config: payload });
  } catch (error) {
    console.error("Admin routing update error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =========================
// MIGRATION: LEGACY ORDERS -> kitchenItems
// =========================
router.post('/routing/migrate', async (req, res) => {
  try {
    const { dryRun = true, limit = 200, migrationId, orderIds, revertMigrationId } = req.body || {};

    if (revertMigrationId) {
      const result = await softDeleteMigration(revertMigrationId);
      return res.status(200).send({
        message: "Migration soft-deleted",
        ...result,
        migrationId: revertMigrationId
      });
    }

    const result = await backfillKitchenItems({
      dryRun: String(dryRun) === "true" || dryRun === true,
      limit: Number(limit) || 200,
      migrationId: migrationId || `migration-${Date.now()}`,
      orderIds: Array.isArray(orderIds) ? orderIds : null
    });

    res.status(200).send(result);
  } catch (error) {
    console.error("Admin migrate orders error:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
