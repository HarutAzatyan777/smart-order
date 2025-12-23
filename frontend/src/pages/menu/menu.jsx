import { useEffect, useMemo, useRef, useState } from "react";
import useMenu from "../../hooks/useMenu";
import useMenuLanguage from "../../hooks/useMenuLanguage";
import {
  SUPPORTED_LANGUAGES,
  buildCategoryList,
  formatCurrencyLocalized,
  localizeMenuItem
} from "../../utils/menuI18n";
import { orderIndex } from "../../utils/categoryOrder";
import "./menu.css";

export default function MenuPage() {
  const { language, setLanguage } = useMenuLanguage();
  const { menu, loading, error, refresh, categories } = useMenu(language);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [ordered, setOrdered] = useState({});
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFloatingFilters, setShowFloatingFilters] = useState(false);
  const sectionRefs = useRef([]);

  const localizedMenu = useMemo(
    () => menu.map((item) => localizeMenuItem(item, language)),
    [menu, language]
  );

  const categoryOptions = useMemo(() => {
    if (categories?.length) {
      return categories.map((cat) => ({
        key: cat.key,
        label: cat.labels?.[language] || cat.labels?.en || cat.key,
        order: cat.order || 0
      }));
    }
    const list = buildCategoryList(localizedMenu, language);
    return list;
  }, [categories, localizedMenu, language]);

  const categoryOrderKeys = useMemo(
    () => (categories && categories.length ? categories.map((c) => c.key) : []),
    [categories]
  );

  const topCategories = useMemo(() => categoryOptions.slice(0, 6), [categoryOptions]);

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();

    const matchesSearch = (item) => {
      if (!term) return true;
      const haystack = [
        item.displayName,
        item.displayDescription,
        item.displayCategory,
        item.notes
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      return haystack.includes(term);
    };

    const base = localizedMenu.filter((item) => {
      const itemCategory = item.category || "Uncategorized";
      if (item.available === false) return false;
      if (category !== "all" && itemCategory !== category) return false;
      return matchesSearch(item);
    });

    const sorted = [...base];
    sorted.sort((a, b) => {
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;
      switch (sortBy) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "alpha":
          return (a.displayName || "").localeCompare(b.displayName || "");
        case "featured":
        default: {
          const idxA = orderIndex(a.category || "Uncategorized", categoryOrderKeys);
          const idxB = orderIndex(b.category || "Uncategorized", categoryOrderKeys);
          if (idxA !== idxB) return idxA - idxB;
          return (a.displayCategory || "").localeCompare(b.displayCategory || "");
        }
      }
    });

    return sorted;
  }, [localizedMenu, category, search, sortBy, categoryOrderKeys]);

  const groupedMenu = useMemo(() => {
    const map = new Map();
    filteredMenu.forEach((item) => {
      const key = item.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const idxA = orderIndex(a[0], categoryOrderKeys);
      const idxB = orderIndex(b[0], categoryOrderKeys);
      if (idxA !== idxB) return idxA - idxB;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [filteredMenu, categoryOrderKeys]);

  const formatPrice = (value) => formatCurrencyLocalized(value, language);

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setSortBy("featured");
  };

  const addToOrder = (item) => {
    const key = item.id || `${item.name || "item"}-${item.category || "uncategorized"}`;
    setOrdered((prev) => ({
      ...prev,
      [key]: { ...item, qty: (prev[key]?.qty || 0) + 1, __orderKey: key }
    }));
  };

  const clearOrder = () => setOrdered({});

  const orderedItems = useMemo(() => Object.values(ordered), [ordered]);
  const orderedCount = useMemo(
    () => orderedItems.reduce((sum, item) => sum + (item.qty || 0), 0),
    [orderedItems]
  );
  const visibleOrders = useMemo(
    () => (showAllOrders ? orderedItems : orderedItems.slice(0, 4)),
    [orderedItems, showAllOrders]
  );

  const availableCount = menu.filter((m) => m.available !== false).length;
  const skeletonCards = useMemo(() => Array.from({ length: 6 }), []);

  const getCategoryLabel = (key) =>
    categoryOptions.find((item) => item.key === key)?.label || key;

  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingFilters(window.scrollY > 220);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean);
    if (!sections.length) return;

    if (typeof IntersectionObserver === "undefined") {
      sections.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    sections.forEach((node) => {
      node.classList.remove("is-visible");
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [groupedMenu]);

  return (
    <div className="menu-v2">
      <div className="menu-v2__shell">
        <header className="menu-v2__hero">
          <div>
            <p className="menu-v2__eyebrow">Menu</p>
            <h1 className="menu-v2__title">Find your next favorite</h1>
              <p className="menu-v2__lede">
                Browse the full list of dishes, filtered by category and crafted fresh.
              </p>
              <div className="menu-v2__chips">
                <span className="menu-v2__chip live">{menu.length} items</span>
                <span className="menu-v2__chip">{categoryOptions.length} categories</span>
                <span className="menu-v2__chip">{availableCount} available</span>
              </div>
              {topCategories.length ? (
                <div className="menu-v2__anchors" aria-label="Quick categories">
                  <button
                    type="button"
                    className={`menu-v2__anchor ${category === "all" ? "is-active" : ""}`}
                    onClick={() => setCategory("all")}
                  >
                    All
                  </button>
                {topCategories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`menu-v2__anchor ${category === cat.key ? "is-active" : ""}`}
                    onClick={() => setCategory(cat.key)}
                  >
                    {cat.label}
                  </button>
                ))}
                </div>
              ) : null}
            </div>
            <div className="menu-v2__hero-actions">
              <div className="menu-v2__lang-switch" aria-label="Language">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`menu-v2__btn ghost small ${language === lang.code ? "is-active" : ""}`}
                    onClick={() => setLanguage(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <button className="menu-v2__btn ghost" type="button" onClick={resetFilters}>
                Reset filters
              </button>
              <button
                className="menu-v2__btn primary"
              type="button"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Reload menu"}
            </button>
          </div>
        </header>

        <section className="menu-v2__controls">
          <div className="menu-v2__control">
            <label htmlFor="menu-search">Search dishes</label>
            <input
              id="menu-search"
              type="search"
              placeholder="Type a dish, ingredient, or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button className="menu-v2__text-btn" type="button" onClick={() => setSearch("")}>
                Clear search
              </button>
            ) : null}
          </div>
          <div className="menu-v2__control">
            <label htmlFor="menu-category">Category</label>
            <select
              id="menu-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div className="menu-v2__control">
            <label htmlFor="menu-sort">Sort by</label>
            <select id="menu-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="featured">Featured (by category)</option>
              <option value="alpha">A → Z</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>
        </section>

        {showFilters ? (
          <div className="menu-v2__filter-drawer" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="menu-v2__filter-sheet">
              <div className="menu-v2__filter-head">
                <h3>Filters</h3>
                <button className="menu-v2__btn ghost small" onClick={() => setShowFilters(false)}>
                  Close
                </button>
              </div>
              <div className="menu-v2__controls panel">
                <div className="menu-v2__control">
                  <label htmlFor="menu-search-mobile">Search dishes</label>
                  <input
                    id="menu-search-mobile"
                    type="search"
                    placeholder="Type a dish, ingredient, or category"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="menu-v2__control">
                <label htmlFor="menu-category-mobile">Category</label>
                <select
                  id="menu-category-mobile"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="all">All categories</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.label}
                      </option>
                    ))}
                </select>
              </div>
                <div className="menu-v2__control">
                  <label htmlFor="menu-sort-mobile">Sort by</label>
                  <select
                    id="menu-sort-mobile"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="featured">Featured (by category)</option>
                    <option value="alpha">A → Z</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                  </select>
                </div>
                <div className="menu-v2__control">
                  <label>Language</label>
                  <div className="menu-v2__lang-toggle">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        className={`menu-v2__btn ghost small ${language === lang.code ? "is-active" : ""}`}
                        onClick={() => setLanguage(lang.code)}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="menu-v2__filter-actions">
                <button className="menu-v2__btn ghost" onClick={resetFilters}>
                  Reset
                </button>
                <button className="menu-v2__btn primary" onClick={() => setShowFilters(false)}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="menu-v2__alert">
            <div>
              <p className="menu-v2__alert-title">Could not load the menu</p>
              <p className="menu-v2__text">{error}</p>
            </div>
            <button className="menu-v2__btn ghost" onClick={refresh}>
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="menu-v2__skeleton">
            <div className="menu-v2__sk-grid">
              {skeletonCards.map((_, idx) => (
                <div className="menu-v2__sk-card" key={idx}>
                  <div className="menu-v2__sk-image shimmer" />
                  <div className="menu-v2__sk-line shimmer wide" />
                  <div className="menu-v2__sk-line shimmer" />
                  <div className="menu-v2__sk-pill shimmer" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!loading && groupedMenu.length === 0 ? (
          <div className="menu-v2__empty">
            <h3>No dishes match these filters.</h3>
            <p className="menu-v2__text">Try another search or reload the menu.</p>
            <div className="menu-v2__empty-actions">
              <button className="menu-v2__btn primary" onClick={resetFilters}>
                Clear filters
              </button>
              <button className="menu-v2__btn ghost" onClick={refresh}>
                Reload
              </button>
            </div>
          </div>
        ) : (
          groupedMenu.map(([cat, items], idx) => (
            <section
              className="menu-v2__section"
              key={cat}
              id={`category-${cat}`}
              ref={(el) => {
                sectionRefs.current[idx] = el;
              }}
            >
              <div className="menu-v2__section-head">
                <div>
                  <p className="menu-v2__eyebrow">Category</p>
                  <h2>{getCategoryLabel(cat)}</h2>
                </div>
                <span className="menu-v2__chip subtle">{items.length} items</span>
              </div>
              <div className="menu-v2__grid">
                {items.map((item, idx) => {
                  const hasImage = Boolean(item.imageUrl);
                  const displayName = item.displayName || item.name;
                  const displayDescription = item.displayDescription || item.description;
                  return (
                    <article
                      key={item.id || `${item.name}-${idx}`}
                      className={["menu-v2__card", hasImage ? "has-image" : "no-image"].join(" ")}
                    >
                      <div
                        className={[
                          "menu-v2__card-image",
                          hasImage ? "" : "is-placeholder"
                        ]
                          .filter(Boolean)
                          .join(" ")}
                          >
                            {hasImage ? (
                              <img
                                src={item.imageUrl}
                                alt={displayName || "Menu item"}
                                loading="lazy"
                                onError={(e) => {
                                  const imgEl = e.currentTarget;
                                  if (imgEl.dataset.fallback === "true" || imgEl.src.includes("placeholder-food.jpg")) {
                                    const wrapper = imgEl.closest(".menu-v2__card-image");
                                if (wrapper) wrapper.classList.add("is-placeholder");
                                imgEl.style.display = "none";
                                return;
                              }
                              imgEl.dataset.fallback = "true";
                              imgEl.src = "/placeholder-food.jpg";
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="menu-v2__card-body">
                        <div className="menu-v2__card-top">
                          <h3>{displayName}</h3>
                          <span className="menu-v2__price">{formatPrice(item.price)}</span>
                        </div>
                        {displayDescription ? (
                          <p className="menu-v2__text">{displayDescription}</p>
                        ) : (
                          <p className="menu-v2__text muted">No description provided.</p>
                        )}
                        <div className="menu-v2__meta">
                          {item.prepTime ? (
                            <span className="menu-v2__pill">Prep: {item.prepTime}</span>
                          ) : null}
                          {item.spiceLevel ? (
                            <span className="menu-v2__pill warm">Spice: {item.spiceLevel}</span>
                          ) : null}
                          {item.allergens ? (
                            <span className="menu-v2__pill alert">Allergens: {item.allergens}</span>
                          ) : null}
                        </div>
                        <div className="menu-v2__actions">
                          <button
                            className="menu-v2__btn primary small"
                            type="button"
                            onClick={() => addToOrder(item)}
                          >
                            Order
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
      {orderedItems.length ? (
        <div className="menu-v2__order-bar">
          <div>
            <p className="menu-v2__eyebrow">Your selection</p>
            <div className="menu-v2__order-list" aria-live="polite">
              {visibleOrders.map((item) => (
                <span key={item.__orderKey} className="menu-v2__pill">
                  {(item.displayName || item.name || "Item")} × {item.qty}
                </span>
              ))}
              {orderedItems.length > visibleOrders.length ? (
                <span className="menu-v2__pill subtle">
                  +{orderedItems.length - visibleOrders.length} more
                </span>
              ) : null}
            </div>
          </div>
          <div className="menu-v2__order-actions">
            <span className="menu-v2__chip subtle">{orderedCount} total</span>
            {orderedItems.length > 4 ? (
              <button
                className="menu-v2__btn ghost small"
                type="button"
                onClick={() => setShowAllOrders((prev) => !prev)}
              >
                {showAllOrders ? "See less" : "See more"}
              </button>
            ) : null}
            <button className="menu-v2__btn ghost" type="button" onClick={clearOrder}>
              Clear
            </button>
          </div>
        </div>
      ) : null}
      {showFloatingFilters ? (
        <button
          type="button"
          className="menu-v2__fab"
          onClick={() => setShowFilters(true)}
          aria-label="Open filters"
        >
          Filters
        </button>
      ) : null}
    </div>
  );
}
