import { useEffect, useMemo, useState } from "react";
import useMenu from "../../hooks/useMenu";
import MenuHeader from "./MenuHeader";
import "./menu.css";

export default function MenuPage() {
  const { menu, loading, error, refresh } = useMenu();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selection, setSelection] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  // Auto-refresh for guest view
  useEffect(() => {
    const id = setInterval(() => refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const categories = useMemo(() => {
    const set = new Set();
    menu.forEach((item) => set.add(item.category || "Uncategorized"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menu]);

  const listify = (value) => {
    if (!value) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    return String(value);
  };

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();

    const matchesSearch = (item) => {
      if (!term) return true;
      const haystack = [
        item.name,
        item.description,
        item.category,
        listify(item.ingredients),
        listify(item.addons),
        listify(item.allergens),
        item.notes
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");
      return haystack.includes(term);
    };

    const base = menu.filter((item) => {
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
          return (a.name || "").localeCompare(b.name || "");
        case "featured":
        default:
          return (a.category || "").localeCompare(b.category || "");
      }
    });

    return sorted;
  }, [menu, category, search, sortBy]);

  const groupedMenu = useMemo(() => {
    const map = new Map();
    filteredMenu.forEach((item) => {
      const key = item.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredMenu]);

  const formatPrice = (value) =>
    `${Number(value || 0).toLocaleString("en-US")} AMD`;

  const getItemKey = (item, idx) => item.id || item.sku || `${item.name}-${idx}`;

  const addToSelection = (item, idx) => {
    const key = getItemKey(item, idx);
    if (!key) return;
    setSelection((prev) => ({
      ...prev,
      [key]: { ...item, id: key, qty: (prev[key]?.qty || 0) + 1 }
    }));
    setModalItem(null);
  };

  const decreaseSelection = (key) => {
    setSelection((prev) => {
      if (!prev[key]) return prev;
      const nextQty = (prev[key].qty || 1) - 1;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return {
        ...prev,
        [key]: { ...prev[key], qty: nextQty }
      };
    });
  };

  const clearSelection = () => setSelection({});

  const selectedItems = useMemo(() => Object.values(selection), [selection]);
  const selectedCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0),
    [selectedItems]
  );

  const categoryCounts = useMemo(
    () =>
      menu.reduce((acc, item) => {
        const key = item.category || "Uncategorized";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    [menu]
  );

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setSortBy("featured");
  };

  return (
    <div className="menu-page presentation">
      <div className="menu-shell">
        <MenuHeader
          controlsOpen={controlsOpen}
          onToggleControls={() => setControlsOpen((prev) => !prev)}
          onRefresh={refresh}
          loading={loading}
          filteredCount={filteredMenu.length}
          categoriesCount={categories.length}
          search={search}
          onSearch={setSearch}
          sortBy={sortBy}
          onSort={setSortBy}
          category={category}
          onCategory={setCategory}
          categories={categories}
          categoryCounts={categoryCounts}
          totalMenuCount={menu.length}
          onResetFilters={resetFilters}
          selectionItems={selectedItems}
          selectionCount={selectedCount}
          onIncreaseSelection={addToSelection}
          onDecreaseSelection={decreaseSelection}
          onClearSelection={clearSelection}
          formatPrice={formatPrice}
        />

        {error ? (
          <div className="menu-alert">
            <div>
              <p className="alert-title">Could not load the menu</p>
              <p className="muted">{error}</p>
            </div>
            <button className="menu-btn ghost" onClick={refresh}>
              Retry
            </button>
          </div>
        ) : null}

        <div className="menu-layout">
          <section className="menu-collection">
            {loading ? (
              <div className="menu-placeholder">Loading menu...</div>
            ) : groupedMenu.length === 0 ? (
              <div className="menu-empty">
                <p className="empty-title">No dishes match these filters.</p>
                <p className="muted">Try adjusting the search or reload.</p>
                <div className="empty-actions">
                  <button className="menu-btn primary" onClick={resetFilters}>
                    Reset filters
                  </button>
                  <button className="menu-btn ghost" onClick={refresh}>
                    Reload
                  </button>
                </div>
              </div>
            ) : (
              groupedMenu.map(([cat, items]) => (
                <div key={cat} className="menu-section">
                  <div className="section-head">
                    <div>
                      <p className="eyebrow">Category</p>
                      <h2>{cat}</h2>
                    </div>
                    <span className="count-chip">{items.length} items</span>
                  </div>

                  <div className="menu-grid">
                    {items.map((item, idx) => {
                      const key = item.id || `${item.name}-${idx}`;
                      const selectionKey = getItemKey(item, idx);
                      const selectedQty = selection[selectionKey]?.qty || 0;

                      return (
                        <article key={key} className="menu-card" onClick={() => setModalItem({ ...item, idx })}>
                          <div className="menu-card-header">
                            <div className="menu-card-title">
                              <h3>{item.name}</h3>
                              {item.sku ? (
                                <span className="tag subtle">SKU: {item.sku}</span>
                              ) : null}
                            </div>
                            <div className="price-stack">
                              <span className="price">{formatPrice(item.price)}</span>
                            </div>
                          </div>

                          {item.description ? (
                            <p className="muted description">{item.description}</p>
                          ) : null}

                          <div className="tag-row">
                            {item.prepTime ? (
                              <span className="tag subtle">Prep: {item.prepTime}</span>
                            ) : null}
                            {item.spiceLevel ? (
                              <span className="tag warm">Spice: {item.spiceLevel}</span>
                            ) : null}
                            {listify(item.allergens) ? (
                              <span className="tag alert">
                                Allergens: {listify(item.allergens)}
                              </span>
                            ) : null}
                          </div>

                          <div className="card-actions">
                            {selectedQty > 0 ? (
                              <div className="qty-chip small">
                                <button onClick={(e) => { e.stopPropagation(); decreaseSelection(selectionKey); }}>-</button>
                                <span>{selectedQty}</span>
                                <button onClick={(e) => { e.stopPropagation(); addToSelection(item, idx); }}>+</button>
                              </div>
                            ) : (
                              <button
                                className="menu-btn ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToSelection(item, idx);
                                }}
                              >
                                Save choice
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>

      {modalItem ? (
        <div className="modal-backdrop" onClick={() => setModalItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow soft">Confirm selection</p>
                <h3>{modalItem.name}</h3>
                <p className="muted">{modalItem.description}</p>
              </div>
              <button className="ghost-btn" onClick={() => setModalItem(null)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              <span className="price">{formatPrice(modalItem.price)}</span>
              {listify(modalItem.allergens) ? (
                <p className="muted small">Allergens: {listify(modalItem.allergens)}</p>
              ) : null}
            </div>
            <div className="modal-actions">
              <button
                className="menu-btn primary"
                onClick={() => addToSelection(modalItem, modalItem.idx)}
              >
                Save choice
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
