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
  return (
    <div className={`menu-header-wrap ${controlsOpen ? "is-open" : "is-collapsed"}`}>
      <header className="menu-header">
        <div className="menu-header-text">
          <div className="menu-title-row">
            <div>
              <p className="eyebrow">Guest menu</p>
              <h1>Bari akhorzhak / Enjoy</h1>
            </div>
            <div className="pill-row">
              <span className="pill subtle">{filteredCount} items</span>
              <span className="pill subtle">{categoriesCount} categories</span>
              {selectionCount > 0 ? (
                <span className="pill accent">{selectionCount} saved</span>
              ) : null}
            </div>
          </div>
          {controlsOpen ? (
            <p className="muted">Only items currently available are shown here.</p>
          ) : null}
        </div>

        <div className="menu-header-controls">
          <div className="menu-header-actions">
            <button
              type="button"
              className="menu-btn ghost small"
              onClick={onToggleControls}
            >
              {controlsOpen ? "Hide panel" : "Show panel"}
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
        <>
          <section className="menu-controls open">
            <div className="control-grid">
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

              <div className="control">
                <label>Sort</label>
                <select value={sortBy} onChange={(e) => onSort(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="alpha">Name (A-Z)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>

              <div className="control summary">
                <p className="muted">
                  Showing <strong>{filteredCount}</strong> available items
                </p>
                <button className="text-btn" onClick={onResetFilters}>
                  Reset search
                </button>
              </div>
            </div>

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

          <div className="menu-header-selection selection-panel">
            <div className="selection-head">
              <div>
                <p className="eyebrow soft">Your picks</p>
                <h2 className="selection-title">
                  {selectionCount > 0
                    ? `${selectionCount} item${selectionCount > 1 ? "s" : ""} chosen`
                    : "Tap to add items"}
                </h2>
                <p className="muted small">
                  Save dishes you want, then show this list to your waiter.
                </p>
              </div>
              {selectionCount > 0 ? (
                <button className="ghost-btn" onClick={onClearSelection}>
                  Clear list
                </button>
              ) : null}
            </div>

            {selectionItems.length === 0 ? (
              <div className="selection-empty">
                Nothing selected yet. Tap "Save choice" on any dish.
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
          </div>
        </>
      ) : null}
    </div>
  );
}
