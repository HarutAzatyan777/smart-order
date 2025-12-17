import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./menuheader.css";

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "uncategorized";

const defaultCategoryIcon = "\u{1F37D}";

const normalizeCategory = (cat, idx) => {
  if (!cat) {
    return { key: `cat-${idx}`, label: "Unknown", value: "Unknown", icon: null };
  }
  if (typeof cat === "string") {
    return { key: slugify(cat) || `cat-${idx}`, label: cat, value: cat, icon: null };
  }
  const label = cat.name || cat.label || cat.slug || `cat-${idx}`;
  return {
    key: slugify(cat.slug || label) || `cat-${idx}`,
    label,
    value: cat.slug || cat.value || label,
    icon: cat.icon || null
  };
};

const renderCategoryIcon = (icon, label) => {
  if (icon?.type === "emoji") {
    return <span aria-hidden="true">{icon.value || defaultCategoryIcon}</span>;
  }
  if (icon?.type === "svg" || icon?.type === "image") {
    return (
      <img
        src={icon.value}
        alt={`${label} icon`}
        className="menu-tab__img"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <span aria-hidden="true">{defaultCategoryIcon}</span>;
};

const getShortLabel = (cat) => {
  if (cat === "all") return "All";
  const words = String(cat).split(" ").filter(Boolean);
  const label = words.slice(0, 2).join(" ");
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
};

export default function MenuHeader({
  controlsOpen,
  onToggleControls,
  onRefresh,
  loading,
  filteredCount,
  categoriesCount,
  search,
  onSearch,
  sortBy,
  onSort,
  category,
  onCategory,
  categories,
  categoryCounts,
  totalMenuCount,
  onResetFilters,
  selectionItems,
  selectionCount,
  onIncreaseSelection,
  onDecreaseSelection,
  onClearSelection,
  formatPrice
}) {
  const [activeCategory, setActiveCategory] = useState(() => category || "all");
  const [moreOpen, setMoreOpen] = useState(false);
  const [showStartFade, setShowStartFade] = useState(false);
  const [showEndFade, setShowEndFade] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tabRailRef = useRef(null);
  const moreRef = useRef(null);
  const observerRef = useRef(null);

  const categoriesWithAll = useMemo(() => {
    const normalized = categories.map((cat, idx) => normalizeCategory(cat, idx));
    return [{ key: "all", label: "All", value: "all", icon: null }, ...normalized];
  }, [categories]);

  const activeFilters = [
    Boolean(category && category !== "all"),
    Boolean(search),
    Boolean(sortBy && sortBy !== "featured")
  ].filter(Boolean).length;

  const filterLabel = activeFilters
    ? `${activeFilters} filter${activeFilters > 1 ? "s" : ""}`
    : "No filters";

  const selectionLabel = `${selectionCount} saved`;

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth <= 720);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const scrollToCategory = useCallback((catValue) => {
    if (catValue === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const el = document.getElementById(`category-${slugify(catValue)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleCategoryClick = (catValue) => {
    setActiveCategory(catValue);
    onCategory(catValue);
    scrollToCategory(catValue);
    setMoreOpen(false);
  };

  const checkRailOverflow = useCallback(() => {
    const rail = tabRailRef.current;
    if (!rail) return;
    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setShowStartFade(rail.scrollLeft > 6);
    setShowEndFade(rail.scrollLeft < maxScrollLeft - 6);
  }, []);

  useEffect(() => {
    const rail = tabRailRef.current;
    if (!rail) return;

    checkRailOverflow();
    const onScroll = () => checkRailOverflow();
    const onResize = () => checkRailOverflow();

    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [categoriesWithAll, checkRailOverflow]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visible.length) return;
        const id = visible[0].target.id;
        const matched = categoriesWithAll.find(
          (cat) => id === `category-${slugify(cat.value)}`
        );

        if (matched) {
          setActiveCategory((prev) => (prev === matched.value ? prev : matched.value));
        }
      },
      {
        root: null,
        rootMargin: "-28% 0px -50% 0px",
        threshold: [0.25, 0.4, 0.55]
      }
    );

    categoriesWithAll
      .filter((cat) => cat.value !== "all")
      .forEach((cat) => {
        const node = document.getElementById(`category-${slugify(cat.value)}`);
        if (node) observer.observe(node);
      });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [categoriesWithAll]);

  const openPanelSection = (selector) => {
    if (!controlsOpen && onToggleControls) {
      onToggleControls();
    }

    setTimeout(() => {
      const node = document.querySelector(selector);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    setMoreOpen(false);
  };

  const handleMoreAction = (action) => {
    switch (action) {
      case "filter":
        if (!controlsOpen && onToggleControls) {
          onToggleControls();
        }
        setMoreOpen(false);
        break;
      case "search":
        openPanelSection('[data-panel-target="search"]');
        break;
      case "sort":
        openPanelSection('[data-panel-target="sort"]');
        break;
      case "saved":
        openPanelSection('[data-panel-target="saved"]');
        break;
      case "cart":
        openPanelSection('[data-panel-target="saved"]');
        break;
      case "refresh":
        onRefresh?.();
        setMoreOpen(false);
        break;
      case "clear":
        onResetFilters?.();
        setActiveCategory("all");
        setMoreOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="menu-header-root compact">
      <header className="menu-header-bar" role="banner">
        <div className="menu-tab-rail-wrapper">
       
          <div
            className="menu-tab-rail"
            ref={tabRailRef}
            role="tablist"
            aria-label="Menu categories"
            onWheel={(e) => {
              if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
              tabRailRef.current?.scrollBy({ left: e.deltaY, behavior: "auto" });
              checkRailOverflow();
            }}
          >
            {categoriesWithAll.map((cat) => {
              const isAll = cat.value === "all";
              const count = isAll ? totalMenuCount : categoryCounts[cat.label] || 0;
              const isActive = activeCategory === cat.value;

              return (
                <button
                  key={cat.key}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  className={`menu-tab${isActive ? " is-active" : ""}`}
                  onClick={() => handleCategoryClick(cat.value)}
                  aria-label={`Category ${cat.label}`}
                  title={cat.label}
                >
                  <span className="menu-tab__icon" aria-hidden="true">
                    {isAll ? "★" : renderCategoryIcon(cat.icon, cat.label)}
                  </span>
                  <span className="menu-tab__label">{getShortLabel(cat.label)}</span>
                  <span className="menu-tab__count" aria-hidden="true">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
       
          {showStartFade ? (
            <div className="menu-tab-rail__fade menu-tab-rail__fade--left" aria-hidden="true" />
          ) : null}
          {showEndFade ? (
            <div className="menu-tab-rail__fade menu-tab-rail__fade--right" aria-hidden="true" />
          ) : null}
        </div>

        <div className="menu-header-actions">
          <div className="menu-more" ref={moreRef}>
    
            {moreOpen && isMobile ? (
              <div className="menu-more__backdrop" onClick={() => setMoreOpen(false)}>
                <div
                  className="menu-more__dropdown is-mobile"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="menu-more__mobile-header">
                    <h4>More actions</h4>
                    <button type="button" className="menu-more__close" onClick={() => setMoreOpen(false)}>
                      Done
                    </button>
                  </div>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("search")}>
                    Search
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("filter")}>
                    Filter ({filterLabel})
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("saved")}>
                    Saved / Favorites ({selectionLabel})
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("cart")}>
                    Cart
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("sort")}>
                    Sort
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("refresh")}>
                    {loading ? "Refreshing..." : "Refresh menu"}
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleMoreAction("clear")}>
                    Clear filters
                  </button>
                  <div className="menu-more__meta" aria-hidden="true">
                    {filteredCount} items · {categoriesCount} categories
                  </div>
                </div>
              </div>
            ) : null}
            {moreOpen && !isMobile ? (
              <div className="menu-more__dropdown" role="menu">
                <button type="button" role="menuitem" onClick={() => handleMoreAction("search")}>
                  Search
                </button>
                <button type="button" role="menuitem" onClick={() => handleMoreAction("filter")}>
                  Filter ({filterLabel})
                </button>
                <button type="button" role="menuitem" onClick={() => handleMoreAction("saved")}>
                  Saved / Favorites ({selectionLabel})
                </button>
                <button type="button" role="menuitem" onClick={() => handleMoreAction("cart")}>
                  Cart
                </button>
                <button type="button" role="menuitem" onClick={() => handleMoreAction("sort")}>
                  Sort
                </button>
                <button type="button" role="menuitem" onClick={() => handleMoreAction("refresh")}>
                  {loading ? "Refreshing..." : "Refresh menu"}
                </button>
                <button type="button" role="menuitem" onClick={() => handleMoreAction("clear")}>
                  Clear filters
                </button>
                <div className="menu-more__meta" aria-hidden="true">
                  {filteredCount} items · {categoriesCount} categories
                </div>
              </div>
            ) : null}
          </div>
        </div>
                <button
              type="button"
              className="menu-more__button"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="More menu actions"
              onClick={() => setMoreOpen((prev) => !prev)}
            >
              <span aria-hidden="true">...</span>
            </button>
      </header>

      {controlsOpen ? (
        <div className="menu-panel-drawer" role="dialog" aria-modal="true" onClick={onToggleControls}>
          <div className="menu-panel-drawer__surface" onClick={(e) => e.stopPropagation()}>
            <div className="menu-panel-header">
              <div>
                <h3>Menu panel</h3>
                <p className="muted small">Only items currently available are shown here.</p>
              </div>
              <button className="menu-btn ghost small" onClick={onToggleControls}>
                Done
              </button>
            </div>

            <section className="menu-panel-section" data-panel-target="search">
              <header className="menu-panel-section__header">
                <span>Search</span>
              </header>
              <div className="control wide">
                <label>Search dishes</label>
                <div className="search-row">
                  <input
                    type="search"
                    placeholder="Search by dish, keyword, or category"
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                  />
                  {search ? (
                    <button className="text-btn" onClick={() => onSearch("")}>
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="menu-panel-section" data-panel-target="sort">
              <header className="menu-panel-section__header">
                <span>Sort</span>
                <p className="muted small">
                  Showing <strong>{filteredCount}</strong> available items
                </p>
              </header>
              <div className="control">
                <label>Sort</label>
                <select value={sortBy} onChange={(e) => onSort(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="alpha">Name (A-Z)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
              <button className="text-btn" onClick={onResetFilters}>
                Reset search
              </button>
            </section>

            <section className="menu-panel-section" data-panel-target="categories">
              <header className="menu-panel-section__header">
                <span>Categories</span>
                <p className="muted small">Tap a tab to focus the menu.</p>
              </header>
              <div className="category-tabs">
                <button
                  className={`category-tab${category === "all" ? " active" : ""}`}
                  onClick={() => onCategory("all")}
                >
                  <span className="tab-icon">*</span>
                  <span>All ({totalMenuCount})</span>
                </button>
                {categoriesWithAll
                  .filter((cat) => cat.value !== "all")
                  .map((cat) => (
                    <button
                      key={cat.key}
                      className={`category-tab${category === cat.value ? " active" : ""}`}
                      onClick={() => onCategory(cat.value)}
                    >
                      <span className="tab-icon">*</span>
                      <span>
                        {cat.label} ({categoryCounts[cat.label] || 0})
                      </span>
                    </button>
                  ))}
              </div>
            </section>

            <section
              className="menu-panel-section menu-panel-section--selections"
              data-panel-target="saved"
            >
              <header className="menu-panel-section__header">
                <span>Selections</span>
                {selectionCount > 0 ? (
                  <button className="ghost-btn" onClick={onClearSelection}>
                    Clear picks
                  </button>
                ) : null}
              </header>
              <div className="selection-head">
                <div>
                  <p className="eyebrow soft">Saved picks</p>
                  <h2 className="selection-title">
                    {selectionCount > 0
                      ? `${selectionCount} item${selectionCount > 1 ? "s" : ""} in the list`
                      : "Start saving dishes"}
                  </h2>
                  <p className="muted small">
                    Keep selections handy to pass along to your waiter.
                  </p>
                </div>
              </div>
              {selectionItems.length === 0 ? (
                <div className="selection-empty">
                  No picks yet. Tap "Save choice" on any dish.
                </div>
              ) : (
                <div className="selection-list">
                  {selectionItems.map((item) => (
                    <div key={item.id} className="selection-row">
                      <div>
                        <p className="selection-name">{item.name}</p>
                        <p className="muted small">{formatPrice(item.price)}</p>
                      </div>
                      <div className="selection-actions">
                        <div className="qty-chip small">
                          <button onClick={() => onDecreaseSelection(item.id)}>-</button>
                          <span>{item.qty || 1}</span>
                          <button onClick={() => onIncreaseSelection(item)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
