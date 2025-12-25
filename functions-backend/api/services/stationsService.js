const { db } = require("../../admin");
const { FieldValue } = require("firebase-admin/firestore");

const stationsCollection = db.collection("stations");
const routingDocRef = db.collection("metadata").doc("stationRouting");
const migrationsCollection = db.collection("metadata").doc("kitchenMigrations");

const normalizeSlug = (value) => {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return slug || null;
};

const normalizeKey = (value) => String(value || "").trim().toLowerCase();
const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") {
    const ms = value.seconds * 1000 + (value.nanoseconds || 0) / 1_000_000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const listStations = async ({ includeInactive = false } = {}) => {
  const snapshot = await stationsCollection.get();
  const stations = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));

  return includeInactive ? stations : stations.filter((s) => s.active !== false);
};

const getStationsMap = async ({ includeInactive = false } = {}) => {
  const stations = await listStations({ includeInactive });
  return stations.reduce((acc, station) => {
    const slug = station.slug || normalizeSlug(station.name);
    if (slug) acc[slug] = { ...station, slug };
    return acc;
  }, {});
};

const getRoutingConfig = async () => {
  const doc = await routingDocRef.get();
  const data = doc.exists ? doc.data() || {} : {};
  return {
    categories: data.categories || {},
    items: data.items || {},
    defaultStation: data.defaultStation || null,
    updatedAt: data.updatedAt || null
  };
};

const saveRoutingConfig = async (config = {}) => {
  const payload = {
    categories: config.categories || {},
    items: config.items || {},
    defaultStation: config.defaultStation || null,
    updatedAt: FieldValue.serverTimestamp()
  };
  await routingDocRef.set(payload, { merge: true });
  return payload;
};

const resolveStationForItem = (item = {}, routingConfig = {}, stationsMap = {}) => {
  const cfg = routingConfig || {};
  const categories = cfg.categories || {};
  const items = cfg.items || {};

  const categoryKey = normalizeKey(item.category || item.displayCategory);
  const itemKey = normalizeKey(item.menuId || item.id || item.name);

  const fromItem = itemKey ? items[itemKey] : null;
  const fromCategory = categoryKey ? categories[categoryKey] : null;
  const candidate = fromItem || fromCategory || cfg.defaultStation || null;

  const fallback =
    !candidate && Object.keys(stationsMap || {}).length === 1
      ? Object.keys(stationsMap)[0]
      : candidate;

  if (!fallback) return null;

  const station = stationsMap[fallback];
  if (station && station.active !== false) {
    return station.slug || station.id || fallback;
  }
  return null;
};

const mapOrderStatusToItem = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "preparing" || normalized === "accepted") return "preparing";
  if (normalized === "ready") return "ready";
  if (normalized === "delivered" || normalized === "closed") return "delivered";
  if (normalized === "cancelled" || normalized === "canceled") return "queued";
  return "queued";
};

const backfillKitchenItems = async ({
  limit = 200,
  dryRun = true,
  migrationId = `migration-${Date.now()}`,
  orderIds = null
} = {}) => {
  const routingConfig = await getRoutingConfig();
  const stationsMap = await getStationsMap({ includeInactive: true });
  const results = {
    scanned: 0,
    skipped: 0,
    created: 0,
    migrationId,
    dryRun,
    samples: []
  };

  let query = db.collection("orders").orderBy("createdAt", "desc").limit(limit);
  if (Array.isArray(orderIds) && orderIds.length) {
    // Fetch explicitly requested orders
    const docs = [];
    for (const id of orderIds) {
      const snap = await db.collection("orders").doc(id).get();
      if (snap.exists) docs.push(snap);
    }
    query = { docs };
  }

  const snapshot = query.docs ? query : await query.get();

  for (const doc of snapshot.docs) {
    results.scanned += 1;
    const order = { id: doc.id, ...doc.data() };
    const orderItems = Array.isArray(order.items) ? order.items : [];
    if (!orderItems.length) {
      results.skipped += 1;
      continue;
    }

    const existing = await db
      .collection("kitchenItems")
      .where("orderId", "==", doc.id)
      .limit(1)
      .get();
    if (!existing.empty) {
      results.skipped += 1;
      continue;
    }

    const batch = dryRun ? null : db.batch();

    orderItems.forEach((item, idx) => {
      const station = resolveStationForItem(item, routingConfig, stationsMap);
      const itemId = item.itemId || item.id || `${doc.id}-${idx}`;
      const createdAt = toDate(item.createdAt) || toDate(order.createdAt) || new Date();
      const status = mapOrderStatusToItem(order.status);
      const payload = {
        orderId: doc.id,
        itemId,
        name: item.name || `Item ${idx + 1}`,
        qty: item.qty || 1,
        station: station || null,
        status,
        orderStatus: order.status || null,
        menuId: item.menuId || item.id || null,
        category: item.category || null,
        table: order.table || null,
        tableId: order.tableId || null,
        batchId: item.batchId || null,
        active: true,
        createdAt,
        updatedAt: createdAt,
        orderCreatedAt: toDate(order.createdAt) || createdAt,
        migrationId
      };

      if (payload.status === "preparing" && !payload.preparingAt) payload.preparingAt = createdAt;
      if (payload.status === "ready") {
        payload.preparingAt = payload.preparingAt || createdAt;
        payload.readyAt = createdAt;
      }
      if (payload.status === "delivered") {
        payload.preparingAt = payload.preparingAt || createdAt;
        payload.readyAt = payload.readyAt || createdAt;
        payload.deliveredAt = createdAt;
      }

      results.created += 1;
      if (results.samples.length < 5) {
        results.samples.push({ orderId: doc.id, item: payload.name, station: payload.station });
      }
      if (!dryRun) {
        const ref = db.collection("kitchenItems").doc(itemId);
        batch.set(ref, payload, { merge: true });
      }
    });

    if (!dryRun) {
      await batch.commit();
    }
  }

  if (!dryRun) {
    await migrationsCollection.collection("runs").doc(migrationId).set({
      created: results.created,
      skipped: results.skipped,
      scanned: results.scanned,
      createdAt: FieldValue.serverTimestamp()
    });
  }

  return results;
};

const softDeleteMigration = async (migrationId) => {
  if (!migrationId) throw new Error("migrationId is required");
  const snap = await db
    .collection("kitchenItems")
    .where("migrationId", "==", migrationId)
    .get();

  if (snap.empty) return { deactivated: 0 };

  const batch = db.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { active: false, updatedAt: FieldValue.serverTimestamp() });
  });
  await batch.commit();

  return { deactivated: snap.size };
};

const pruneRoutingForDeletion = async (slug, reassignTo = null) => {
  const cfg = await getRoutingConfig();
  const categories = { ...cfg.categories };
  const items = { ...cfg.items };

  Object.keys(categories).forEach((key) => {
    if (categories[key] === slug) {
      if (reassignTo) categories[key] = reassignTo;
      else delete categories[key];
    }
  });

  Object.keys(items).forEach((key) => {
    if (items[key] === slug) {
      if (reassignTo) items[key] = reassignTo;
      else delete items[key];
    }
  });

  await saveRoutingConfig({
    ...cfg,
    categories,
    items,
    defaultStation: cfg.defaultStation === slug ? reassignTo || null : cfg.defaultStation
  });
};

module.exports = {
  listStations,
  getStationsMap,
  getRoutingConfig,
  saveRoutingConfig,
  resolveStationForItem,
  normalizeSlug,
  pruneRoutingForDeletion,
  stationsCollection,
  routingDocRef,
  backfillKitchenItems,
  softDeleteMigration
};
