const DEFAULT_LANGUAGE = "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hy", label: "Հայերեն" }
];

const normalizeLang = (lang) => SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.code || DEFAULT_LANGUAGE;

export const getMenuField = (item, field, language) => {
  // Prefer explicitly provided display fields from API when present
  const displayKey = `display${field.charAt(0).toUpperCase()}${field.slice(1)}`;
  if (item && item[displayKey]) return item[displayKey];

  const lang = normalizeLang(language);
  const fromTranslations = item?.translations?.[lang]?.[field];
  if (typeof fromTranslations === "string" && fromTranslations.trim()) {
    return fromTranslations.trim();
  }

  const fallbackEn = item?.translations?.en?.[field];
  if (typeof fallbackEn === "string" && fallbackEn.trim()) {
    return fallbackEn.trim();
  }

  const direct = item?.[field];
  return typeof direct === "string" ? direct : direct ?? "";
};

export const localizeMenuItem = (item, language) => {
  const displayCategory = getMenuField(item, "category", language) || item?.category || "Uncategorized";

  return {
    ...item,
    displayName: getMenuField(item, "name", language),
    displayDescription: getMenuField(item, "description", language),
    displayCategory
  };
};

export const buildCategoryList = (items, language) => {
  const map = new Map();
  items.forEach((item) => {
    const key = item?.category || "Uncategorized";
    if (!map.has(key)) {
      map.set(key, getMenuField(item, "category", language) || key);
    }
  });

  return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
};

export const formatCurrencyLocalized = (value, language) => {
  const lang = normalizeLang(language);
  const locales = lang === "hy" ? "hy-AM" : "en-US";
  const number = Number(value) || 0;
  return `${number.toLocaleString(locales)} AMD`;
};
