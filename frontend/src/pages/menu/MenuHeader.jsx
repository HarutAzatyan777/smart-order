import { Link } from "react-router-dom";
import "./menuheader.css";

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
  const activeFilters = [
    Boolean(category && category !== "all"),
    Boolean(search),
    Boolean(sortBy && sortBy !== "featured")
  ].filter(Boolean).length;

  const filterLabel = activeFilters
    ? `${activeFilters} filter${activeFilters > 1 ? "s" : ""}`
    : "No filters";

  const selectionLabel = `${selectionCount} saved`;
  return (
    <div className={`menu-header-root ${controlsOpen ? "is-open" : "is-collapsed"}`}>
      <header className="menu-header">
        <div className="menu-header__text">
          <div className="menu-header__title-row">
            {/* <div>
              <p className="eyebrow">Guest menu</p>
              <h1>Menu</h1>
            </div> */}
            <div className="menu-header__pill-row">
              <span className="menu-header__pill">{filteredCount} items</span>
              <span className="menu-header__pill">{categoriesCount} categories</span>
              {selectionCount > 0 ? (
                <span className="menu-header__pill menu-header__pill--accent">
                  {selectionCount} saved
                </span>
              ) : null}
            </div>
          </div>
          {controlsOpen ? (
            <p className="muted">Showing dishes that are ready to serve right now.</p>
          ) : null}
        </div>

        <div className="menu-header__controls">
          <div className="menu-header__chip-row">
            <button
              type="button"
              className={`menu-chip ${controlsOpen ? "is-active" : ""}`}
              onClick={onToggleControls}
              aria-pressed={controlsOpen}
              aria-expanded={controlsOpen}
            >
              <span className="menu-chip__label">Refine</span>
              <span className="menu-chip__badge">
                <span>{filterLabel}</span>
                <span aria-hidden="true">|</span>
                <span>{selectionLabel}</span>
              </span>
            </button>
            <Link to="/waiter/create" className="menu-btn ghost small">
              Call waiter
            </Link>
          </div>
          <button
            type="button"
            className="menu-btn primary"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh menu"}
          </button>
        </div>
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

            <section className="menu-panel-section">
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

            <section className="menu-panel-section">
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

            <section className="menu-panel-section">
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
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`category-tab${category === cat ? " active" : ""}`}
                    onClick={() => onCategory(cat)}
                  >
                    <span className="tab-icon">*</span>
                    <span>
                      {cat} ({categoryCounts[cat] || 0})
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="menu-panel-section menu-panel-section--selections">
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
