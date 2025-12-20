import { useMemo, useState } from "react";
import useMenu from "../../hooks/useMenu";
import "./menu.css";

export default function MenuPage() {
  const { menu, loading, error, refresh } = useMenu();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  const categories = useMemo(() => {
    const set = new Set(menu.map((item) => item.category || "Uncategorized"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();

    const matchesSearch = (item) => {
      if (!term) return true;
      const haystack = [
        item.name,
        item.description,
        item.category,
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
    return Array.from(map.entries());
  }, [filteredMenu]);

  const formatPrice = (value) =>
    `${Number(value || 0).toLocaleString("en-US")} AMD`;

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setSortBy("featured");
  };

  const availableCount = menu.filter((m) => m.available !== false).length;

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
              <span className="menu-v2__chip">{menu.length} items</span>
              <span className="menu-v2__chip">{categories.length} categories</span>
              <span className="menu-v2__chip">{availableCount} available</span>
            </div>
          </div>
          <div className="menu-v2__hero-actions">
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
          </div>
          <div className="menu-v2__control">
            <label htmlFor="menu-category">Category</label>
            <select
              id="menu-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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

        {loading ? <div className="menu-v2__loading">Loading menu...</div> : null}

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
          groupedMenu.map(([cat, items]) => (
            <section className="menu-v2__section" key={cat} id={`category-${cat}`}>
              <div className="menu-v2__section-head">
                <div>
                  <p className="menu-v2__eyebrow">Category</p>
                  <h2>{cat}</h2>
                </div>
                <span className="menu-v2__chip subtle">{items.length} items</span>
              </div>
              <div className="menu-v2__grid">
                {items.map((item, idx) => (
                  <article
                    key={item.id || `${item.name}-${idx}`}
                    className="menu-v2__card"
                  >
                    {item.imageUrl ? (
                      <div className="menu-v2__card-image">
                        <img src={item.imageUrl} alt={item.name || "Menu item"} />
                      </div>
                    ) : null}
                    <div className="menu-v2__card-body">
                      <div className="menu-v2__card-top">
                        <h3>{item.name}</h3>
                        <span className="menu-v2__price">{formatPrice(item.price)}</span>
                      </div>
                      {item.description ? (
                        <p className="menu-v2__text">{item.description}</p>
                      ) : null}
                      <div className="menu-v2__meta">
                        {item.prepTime ? (
                          <span className="menu-v2__pill">Prep: {item.prepTime}</span>
                        ) : null}
                        {item.spiceLevel ? (
                          <span className="menu-v2__pill warm">Spice: {item.spiceLevel}</span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

