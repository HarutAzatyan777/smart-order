import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../../api/ordersApi";
import useMenu from "../../hooks/useMenu";
import "./WaiterOrderCreate.css";

export default function WaiterOrderCreate() {
  const { menu, loading: menuLoading, error: menuError, refresh } = useMenu();

  const [table, setTable] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const waiterName = localStorage.getItem("waiterName") || "Unknown waiter";

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return menu;

    return menu.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const desc = item.description?.toLowerCase() || "";
      return name.includes(term) || desc.includes(term);
    });
  }, [menu, search]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const totalQty = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.qty || 0), 0),
    [cartItems]
  );
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + (Number(item.price) || 0) * (item.qty || 0),
        0
      ),
    [cartItems]
  );

  const addToCart = (item) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 }
    }));
  };

  const decreaseQty = (itemId) => {
    setCart((prev) => {
      const current = prev[itemId]?.qty || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }

      return {
        ...prev,
        [itemId]: { ...prev[itemId], qty: current - 1 }
      };
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const clearCart = () => setCart({});

  const handleSubmit = async () => {
    setSubmitError("");

    const waiterId = localStorage.getItem("waiterId");

    if (!waiterId || !waiterName) {
      setSubmitError("You must log in as a waiter first.");
      return;
    }

    const tableNumber = Number(table);
    if (!tableNumber || tableNumber <= 0) {
      setSubmitError("Please enter a valid table number.");
      return;
    }

    if (cartItems.length === 0) {
      setSubmitError("Please add at least one item.");
      return;
    }

    const payload = {
      table: tableNumber,
      notes: notes.trim(),
      items: cartItems.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.price
      })),
      waiterId,
      waiterName
    };

    try {
      setSubmitting(true);
      await createOrder(payload);
      navigate("/waiter/home");
    } catch (err) {
      console.error("Create order error:", err);
      const backendError =
        err.response?.data?.error || "Could not create order.";
      setSubmitError(backendError);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !submitting && table && Number(table) > 0 && cartItems.length > 0;

  const formatPrice = (value) =>
    `${Number(value || 0).toLocaleString("en-US")} AMD`;

  return (
    <div className="order-create-page">
      <header className="order-header">
        <div>
          <p className="eyebrow">Waiter console</p>
          <h1 className="page-title">Create New Order</h1>
          <p className="muted">
            Add dishes, capture notes, and send the order to the kitchen.
          </p>
        </div>

        <div className="waiter-chip">
          <span className="pill-label">Waiter</span>
          <span>{waiterName}</span>
        </div>
      </header>

      {(submitError || menuError) && (
        <div className="alert error">
          <span>{submitError || menuError}</span>
          {menuError ? (
            <button onClick={refresh} className="link-btn">
              Retry loading menu
            </button>
          ) : null}
        </div>
      )}

      <div className="order-grid">
        <section className="panel menu-panel">
          <div className="panel-heading">
            <div className="field">
              <label>Table</label>
              <input
                type="number"
                placeholder="Table number"
                value={table}
                onChange={(e) => setTable(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Search menu</label>
              <input
                type="search"
                placeholder="Type dish or keyword"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {menuLoading ? (
            <div className="skeleton">Loading menu...</div>
          ) : filteredMenu.length === 0 ? (
            <div className="empty-state">
              No items match your search.{" "}
              <button className="link-btn" onClick={() => setSearch("")}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredMenu.map((item) => (
                <article key={item.id} className="menu-card">
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
                    {cart[item.id]?.qty ? (
                      <div className="qty-chip">
                        <button onClick={() => decreaseQty(item.id)}>-</button>
                        <span>{cart[item.id].qty}</span>
                        <button onClick={() => addToCart(item)}>+</button>
                      </div>
                    ) : (
                      <button
                        className="ghost-btn"
                        onClick={() => addToCart(item)}
                      >
                        Add to order
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="panel summary-panel">
          <div className="summary-heading">
            <div>
              <p className="eyebrow">Order summary</p>
              <h2>Table {table || "-"}</h2>
            </div>
            {cartItems.length > 0 && (
              <button className="link-btn" onClick={clearCart}>
                Clear
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="empty-state">No items added yet.</div>
          ) : (
            <div className="cart-list">
              {cartItems.map((item) => (
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
                    <button
                      className="icon-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="field">
            <label>Notes (optional)</label>
            <textarea
              rows="3"
              placeholder="Allergies, timing, or other details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="totals">
            <div>
              <span className="muted">Items</span>
              <strong>{totalQty}</strong>
            </div>
            <div>
              <span className="muted">Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? "Sending..." : "Send to Kitchen"}
          </button>
        </aside>
      </div>
    </div>
  );
}
