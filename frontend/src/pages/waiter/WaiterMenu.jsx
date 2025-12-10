import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useMenu from "../../hooks/useMenu";
import "./WaiterMenu.css";

export default function WaiterMenu() {
  const { menu, loading, error, refresh } = useMenu();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return menu;
    return menu.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const desc = item.description?.toLowerCase() || "";
      return name.includes(term) || desc.includes(term);
    });
  }, [menu, search]);

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id);
      if (exists) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const decreaseQty = (id) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const totalQty = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  const totalPrice = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.qty || 0),
    0
  );

  const formatPrice = (value) =>
    `${Number(value || 0).toLocaleString("en-US")} AMD`;

  return (
    <div className="waiter-menu-page">
      <div className="menu-top">
        <div>
          <p className="eyebrow">Menu browser</p>
          <h1 className="page-title">Browse & Stage Order</h1>
          <p className="muted">
            Quickly search the menu, stage a table-side order, and review totals.
          </p>
        </div>

        <div className="menu-actions-bar">
          <input
            type="search"
            placeholder="Search dishes or keywords"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="ghost-btn" onClick={refresh}>
            Refresh
          </button>
          <Link to="/waiter/create" className="primary-link">
            Go to order form
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert error">
          <span>{error}</span>
          <button className="link-btn" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      <div className="menu-shell">
        <section className="panel">
          {loading ? (
            <div className="skeleton">Loading menu...</div>
          ) : filteredMenu.length === 0 ? (
            <div className="empty-state">
              No items found.{" "}
              <button className="link-btn" onClick={() => setSearch("")}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <article className="menu-card" key={item.id}>
                  <div>
                    <div className="menu-card-top">
                      <h3>{item.name}</h3>
                      <span className="price-tag">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    <p className="muted">{item.description}</p>
                  </div>

                  <div className="menu-actions">
                    <button className="ghost-btn" onClick={() => addToCart(item)}>
                      Add
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel cart-preview">
          <div className="cart-header">
            <div>
              <p className="eyebrow">Tray</p>
              <h2>Selected items</h2>
            </div>
            {cart.length > 0 && (
              <button className="link-btn" onClick={() => setCart([])}>
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="empty-state">No items selected.</div>
          ) : (
            <div className="cart-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-row">
                  <div>
                    <p className="cart-title">{item.name}</p>
                    <p className="muted">{formatPrice(item.price)}</p>
                  </div>
                  <div className="cart-actions">
                    <div className="qty-chip small">
                      <button onClick={() => decreaseQty(item.id)}>-</button>
                      <span>{item.qty}</span>
                      <button onClick={() => addToCart(item)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="totals">
            <div>
              <span className="muted">Items</span>
              <strong>{totalQty}</strong>
            </div>
            <div>
              <span className="muted">Total</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>
          </div>

          <p className="muted note">
            Ready to send? Use the order form to select a table and dispatch to
            the kitchen.
          </p>
        </aside>
      </div>
    </div>
  );
}
