import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createOrder } from "../../api/ordersApi";
import useMenu from "../../hooks/useMenu";
import useMenuLanguage from "../../hooks/useMenuLanguage";
import useTables from "../../hooks/useTables";
import {
  SUPPORTED_LANGUAGES,
  formatCurrencyLocalized,
  localizeMenuItem
} from "../../utils/menuI18n";
import "./WaiterOrderCreate.css";

export default function WaiterOrderCreate() {
  const location = useLocation();
  const { language, setLanguage } = useMenuLanguage();
  const { menu, loading: menuLoading, error: menuError, refresh } = useMenu(language);
  const { tables, loading: tablesLoading, error: tablesError, refresh: refreshTables } = useTables();

  const initialTableId =
    location.state?.tableId ||
    sessionStorage.getItem("selectedTableId") ||
    localStorage.getItem("selectedTableId") ||
    "";

  const [tableId, setTableId] = useState(initialTableId);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  const navigate = useNavigate();

  const waiterName = localStorage.getItem("waiterName") || "Unknown waiter";
  const activeTables = tables.filter((t) => t.active !== false);
  const selectedTable = activeTables.find((t) => t.id === tableId);
  const localizedMenu = useMemo(
    () => menu.map((item) => localizeMenuItem(item, language)),
    [menu, language]
  );

  useEffect(() => {
    if (location.state?.tableId) {
      setTableId(location.state.tableId);
      sessionStorage.setItem("selectedTableId", location.state.tableId);
      localStorage.setItem("selectedTableId", location.state.tableId);
    }
  }, [location.state]);

  useEffect(() => {
    if (!tableId && !tablesLoading) {
      navigate("/waiter/select-table", { replace: true });
    }
  }, [tableId, tablesLoading, navigate]);

  useEffect(() => {
    if (tableId && !tablesLoading && !selectedTable) {
      sessionStorage.removeItem("selectedTableId");
      localStorage.removeItem("selectedTableId");
      navigate("/waiter/select-table", {
        replace: true,
        state: { error: "Selected table is unavailable. Please choose another table." }
      });
    }
  }, [tableId, selectedTable, tablesLoading, navigate]);

  const getItemKey = (item) => item?.id || item?.sku || item?.name;

  const filteredMenu = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return localizedMenu;

    return localizedMenu.filter((item) => {
      const name = item.displayName?.toLowerCase() || item.name?.toLowerCase() || "";
      const desc =
        item.displayDescription?.toLowerCase() || item.description?.toLowerCase() || "";
      const cat =
        item.displayCategory?.toLowerCase() || item.category?.toLowerCase() || "";
      return name.includes(term) || desc.includes(term) || cat.includes(term);
    });
  }, [localizedMenu, search]);

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
    if (item.available === false) return;
    const key = getItemKey(item);
    if (!key) return;

    setCart((prev) => ({
      ...prev,
      [key]: { ...item, id: key, qty: (prev[key]?.qty || 0) + 1 }
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

  const listify = (value) => {
    if (!value) return null;
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    return String(value);
  };

  const handleSubmit = async () => {
    setSubmitError("");

    const waiterId = localStorage.getItem("waiterId");

    if (!waiterId || !waiterName) {
      setSubmitError("You must log in as a waiter first.");
      return;
    }

    if (!selectedTable) {
      setSubmitError("Please select a table first.");
      navigate("/waiter/select-table");
      return;
    }

    if (cartItems.length === 0) {
      setSubmitError("Please add at least one item.");
      return;
    }

    const payload = {
      tableId: selectedTable.id,
      tableNumber: selectedTable.number,
      table: selectedTable.number,
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
      sessionStorage.removeItem("selectedTableId");
      localStorage.removeItem("selectedTableId");
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

  const canSubmit = !submitting && Boolean(selectedTable) && cartItems.length > 0;

  const formatPrice = (value) => formatCurrencyLocalized(value, language);

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

        <div className="header-actions">
          <Link to="/waiter/home" className="ghost-btn">
            Waiter Home
          </Link>
          <span className="pill live-chip">Live (Firestore)</span>
          <div className="waiter-chip">
            <span className="pill-label">Waiter</span>
            <span>{waiterName}</span>
          </div>
        </div>
      </header>

      {selectedTable ? (
        <div className="selected-table-banner">
          <div>
            <p className="eyebrow soft">Table selected</p>
            <strong>Table #{selectedTable.number}</strong>
            {selectedTable.label ? <span className="muted"> - {selectedTable.label}</span> : null}
          </div>
          <div className="banner-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => navigate("/waiter/select-table")}
            >
              Change table
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={refreshTables}
              disabled={tablesLoading}
            >
              {tablesLoading ? "Checking..." : "Refresh tables"}
            </button>
          </div>
        </div>
      ) : null}

      {(submitError || menuError || tablesError) && (
        <div className="alert error">
          <span>{submitError || menuError || tablesError}</span>
          {menuError ? (
            <button onClick={refresh} className="link-btn">
              Retry loading menu
            </button>
          ) : tablesError ? (
            <button className="link-btn" onClick={refreshTables} type="button">
              Retry loading tables
            </button>
          ) : null}
        </div>
      )}

      {!menuLoading && menu.length === 0 ? (
        <div className="panel empty-panel">
          <p className="empty-title">No menu items found in Firestore.</p>
          <p className="muted small">Add items in the Admin panel, then reload this page.</p>
          <button className="ghost-btn" onClick={refresh}>Reload menu</button>
        </div>
      ) : null}

      <div className="order-grid">
        <section className="panel menu-panel">
          <div className="panel-heading">
            <div className="field">
              <label>Search menu</label>
              <input
                type="search"
                placeholder="Type dish or keyword"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Language</label>
              <div className="language-toggle">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`ghost-btn ${language === lang.code ? "is-active" : ""}`}
                    onClick={() => setLanguage(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {menuLoading ? (
            <div className="skeleton">Loading menu...</div>
          ) : filteredMenu.length === 0 ? (
            <div className="empty-state">
              No items match your search.
              <div className="empty-actions">
                <button className="link-btn" onClick={() => setSearch("")}>
                  Clear search
                </button>
                <button className="link-btn" onClick={refresh}>
                  Reload menu
                </button>
              </div>
            </div>
          ) : (
            <div className="menu-grid">
              {filteredMenu.map((item, idx) => {
                const itemKey = getItemKey(item) || String(idx);
                const hasImage = Boolean(item.imageUrl);
                const unavailable = item.available === false;
                const displayName = item.displayName || item.name;
                const displayDescription = item.displayDescription || item.description;
                const displayCategory = item.displayCategory || item.category;

                return (
                  <article
                    key={itemKey}
                    className={`menu-card ${hasImage ? "has-image" : "no-image"} ${
                      unavailable ? "is-disabled" : ""
                    }`}
                    onClick={() => setModalItem({ ...item, itemKey })}
                  >
                    {hasImage ? (
                      <div className="menu-card-image">
                        <img src={item.imageUrl} alt={displayName || "Menu item"} />
                      </div>
                    ) : null}

                    <div className="menu-card-body">
                      <div className="menu-card-top">
                        <div className="menu-card-title">
                          <h3>{displayName}</h3>
                          {displayCategory ? (
                            <span className="pill">{displayCategory}</span>
                          ) : null}
                          {item.sku ? (
                            <span className="pill ghost">SKU: {item.sku}</span>
                          ) : null}
                          {unavailable ? <span className="pill warning">Unavailable</span> : null}
                        </div>
                        <span className="price-tag">{formatPrice(item.price)}</span>
                      </div>

                      {displayDescription ? <p className="muted">{displayDescription}</p> : null}
                      {item.notes ? <p className="muted small">Notes: {item.notes}</p> : null}

                      <div className="meta-row">
                        {item.prepTime ? (
                          <span className="pill ghost">Prep: {item.prepTime}</span>
                        ) : null}
                        {item.spiceLevel ? (
                          <span className="pill ghost">Spice: {item.spiceLevel}</span>
                        ) : null}
                        {listify(item.ingredients) ? (
                          <span className="pill light">
                            Ingredients: {listify(item.ingredients)}
                          </span>
                        ) : null}
                      </div>

                      {listify(item.allergens) ? (
                        <p className="muted small warning-text">
                          Allergens: {listify(item.allergens)}
                        </p>
                      ) : null}

                      {listify(item.addons) ? (
                        <p className="muted small">Add-ons: {listify(item.addons)}</p>
                      ) : null}

                      {listify(item.variants) ? (
                        <p className="muted small">Variants: {listify(item.variants)}</p>
                      ) : null}
                    </div>

                    <div className="menu-actions">
                      {cart[itemKey]?.qty ? (
                        <div className="qty-chip">
                          <button onClick={(e) => { e.stopPropagation(); decreaseQty(itemKey); }}>-</button>
                          <span>{cart[itemKey].qty}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                            disabled={unavailable}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          className="ghost-btn"
                          onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                          disabled={unavailable}
                        >
                          {unavailable ? "Out of stock" : "Add to order"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="panel summary-panel">
          <div className="summary-heading">
            <div>
              <p className="eyebrow">Order summary</p>
              <h2>
                {selectedTable
                  ? selectedTable.label || `Table ${selectedTable.number}`
                  : "Table -"}
              </h2>
              {selectedTable ? (
                <p className="muted small">Table #{selectedTable.number}</p>
              ) : (
                <p className="muted small">No table selected</p>
              )}
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
                    <p className="cart-title">{item.displayName || item.name}</p>
                    <p className="muted small">
                      {formatPrice(item.price)} each &bull;{" "}
                      {formatPrice((Number(item.price) || 0) * (item.qty || 0))} total
                    </p>
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

      {modalItem ? (
        <div className="modal-backdrop" onClick={() => setModalItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow soft">Confirm selection</p>
                <h3>{modalItem.displayName || modalItem.name}</h3>
                <p className="muted">{modalItem.displayDescription || modalItem.description}</p>
              </div>
              <button className="ghost-btn" onClick={() => setModalItem(null)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              {modalItem.imageUrl ? (
                <div className="modal-image">
                  <img
                    src={modalItem.imageUrl}
                    alt={modalItem.displayName || modalItem.name || "Menu item"}
                  />
                </div>
              ) : null}
              <span className="price">{formatPrice(modalItem.price)}</span>
              {listify(modalItem.allergens) ? (
                <p className="muted small">Allergens: {listify(modalItem.allergens)}</p>
              ) : null}
            </div>
            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={() => {
                  addToCart(modalItem);
                  setModalItem(null);
                }}
              >
                Add to order
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cartItems.length > 0 ? (
        <div className="mobile-submit-bar">
          <div>
            <p className="muted small">
              {selectedTable ? `Table #${selectedTable.number}` : "Select a table"}
            </p>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <button
            className="primary-btn"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? "Sending..." : "Send to Kitchen"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
