const CATEGORY_ORDER_KEY = "adminCategoryOrder";

export const loadCategoryOrder = () => {
  try {
    const raw = localStorage.getItem(CATEGORY_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Could not read category order", err);
    return [];
  }
};

export const orderIndex = (key, order) => {
  const idx = order.indexOf(key);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

export const applyCategoryOrder = (list, order) => {
  if (!Array.isArray(list) || !order?.length) return list || [];
  const getKey = (item) => (typeof item === "string" ? item : item.key);
  const sorted = [...list].sort((a, b) => {
    const aKey = getKey(a);
    const bKey = getKey(b);
    const idxA = orderIndex(aKey, order);
    const idxB = orderIndex(bKey, order);
    if (idxA !== idxB) return idxA - idxB;
    const aLabel = typeof a === "string" ? a : a.label || aKey;
    const bLabel = typeof b === "string" ? b : b.label || bKey;
    return String(aLabel).localeCompare(String(bLabel));
  });
  return sorted;
};

export { CATEGORY_ORDER_KEY };
