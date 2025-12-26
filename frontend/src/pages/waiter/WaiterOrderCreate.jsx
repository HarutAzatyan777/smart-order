import { useEffect, useMemo, useRef, useState } from "react";
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
import { setAnalyticsContext, trackEvent } from "../../utils/analytics";
import "./WaiterOrderCreate.css";
import "../menu/menu.css";

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
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const orderStartedRef = useRef(false);

  const navigate = useNavigate();

  const waiterName = localStorage.getItem("waiterName") || "Unknown waiter";
  const activeTables = tables.filter((t) => t.active !== false);
  const selectedTable = activeTables.find((t) => t.id === tableId);
  const localizedMenu = useMemo(
    () => menu.map((item) => localizeMenuItem(item, language)),
    [menu, language]
  );
  const categoryOptions = useMemo(() => {
    const set = new Set();
    localizedMenu.forEach((item) => {
      const key = item.category || item.displayCategory || "Uncategorized";
      set.add(key);
    });
    return ["all", ...Array.from(set)];
  }, [localizedMenu]);

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

  useEffect(() => {
    setAnalyticsContext({
      userRole: "waiter",
      tableNumber: selectedTable?.number || null
    });
  }, [selectedTable]);

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
      const matchesSearch = name.includes(term) || desc.includes(term) || cat.includes(term);
      const matchesCategory =
        categoryFilter === "all" ||
        (item.category || item.displayCategory || "Uncategorized") === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [localizedMenu, search, categoryFilter]);

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

    setCart((prev) => {
      const currentQty = prev[key]?.qty || 0;
      const nextQty = currentQty + 1;
      const orderValue = (Number(item.price) || 0) * nextQty;

      if (!orderStartedRef.current) {
        trackEvent("order_started", {
          table_number: selectedTable?.number,
          waiter_name: waiterName,
          order_value: orderValue || undefined
        });
        orderStartedRef.current = true;
      }

      trackEvent("item_added", {
        item_id: item.id || item.sku || item.name,
        item_name: item.displayName || item.name,
        category: item.displayCategory || item.category || "Uncategorized",
        price: Number(item.price) || 0,
        quantity: nextQty,
        order_value: orderValue || undefined,
        table_number: selectedTable?.number,
        waiter_name: waiterName
      });

      return {
        ...prev,
        [key]: { ...item, id: key, qty: nextQty }
      };
    });
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
        price: item.price,
        category: item.category,
        menuId: item.id
      })),
      waiterId,
      waiterName
    };

    try {
      setSubmitting(true);
      await createOrder(payload);
      trackEvent("order_submitted", {
        order_value: subtotal,
        table_number: selectedTable?.number,
        waiter_id: waiterId,
        waiter_name: waiterName,
        items_count: cartItems.length
      });
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

  const renderSummaryContent = () => (
    <>
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
    </>
  );

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
        <section className="panel menu-panel waiter-menu-v2 menu-v2">
          <div className="waiter-menu-v2__controls menu-v2__controls">
            <div className="waiter-menu-v2__control menu-v2__control">
              <label>Search dishes</label>
              <input
                type="search"
                placeholder="Type a dish, ingredient, or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  className="waiter-menu-v2__text-btn menu-v2__text-btn"
                  type="button"
                  onClick={() => setSearch("")}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="waiter-menu-v2__control menu-v2__control">
              <label>Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All categories" : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="waiter-menu-v2__control menu-v2__control">
              <label>Language</label>
              <div className="waiter-menu-v2__lang-toggle menu-v2__lang-toggle">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`waiter-menu-v2__btn menu-v2__btn ghost small ${
                      language === lang.code ? "is-active" : ""
                    }`}
                    onClick={() => setLanguage(lang.code)}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="waiter-menu-v2__control menu-v2__control">
              <label>Actions</label>
              <div className="waiter-menu-v2__lang-toggle menu-v2__lang-toggle">
                <button
                  className="waiter-menu-v2__btn menu-v2__btn ghost small"
                  type="button"
                  onClick={refresh}
                >
                  Reload menu
                </button>
              </div>
            </div>
          </div>

          {menuLoading ? (
            <div className="waiter-menu-v2__skeleton menu-v2__skeleton">
              <div className="waiter-menu-v2__sk-grid menu-v2__sk-grid">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div className="waiter-menu-v2__sk-card menu-v2__sk-card" key={idx}>
                    <div className="waiter-menu-v2__sk-image menu-v2__sk-image shimmer" />
                    <div className="waiter-menu-v2__sk-line menu-v2__sk-line shimmer wide" />
                    <div className="waiter-menu-v2__sk-line menu-v2__sk-line shimmer" />
                    <div className="waiter-menu-v2__sk-pill menu-v2__sk-pill shimmer" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredMenu.length === 0 ? (
            <div className="waiter-menu-v2__empty menu-v2__empty">
              <h3>No dishes match this search.</h3>
              <p className="waiter-menu-v2__text menu-v2__text">
                Try another keyword or reload the menu.
              </p>
              <div className="waiter-menu-v2__empty-actions menu-v2__empty-actions">
                <button
                  className="waiter-menu-v2__btn menu-v2__btn primary"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
                <button
                  className="waiter-menu-v2__btn menu-v2__btn ghost"
                  onClick={refresh}
                >
                  Reload
                </button>
              </div>
            </div>
          ) : (
            <div className="waiter-menu-v2__grid menu-v2__grid">
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
                    className={[
                      "waiter-menu-v2__card",
                      "menu-v2__card",
                      hasImage ? "has-image" : "no-image",
                      unavailable ? "is-disabled" : ""
                    ].join(" ")}
                    onClick={() => setModalItem({ ...item, itemKey })}
                  >
                    <div
                      className={[
                        "waiter-menu-v2__card-image",
                        "menu-v2__card-image",
                        hasImage ? "" : "is-placeholder"
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {hasImage ? (
                        <img src={item.imageUrl} alt={displayName || "Menu item"} loading="lazy" />
                      ) : null}
                    </div>

                    <div className="waiter-menu-v2__card-body menu-v2__card-body">
                      <div className="waiter-menu-v2__card-top menu-v2__card-top">
                        <div>
                          <h3>{displayName}</h3>
                          {displayCategory ? (
                            <span className="waiter-menu-v2__pill menu-v2__pill subtle">
                              {displayCategory}
                            </span>
                          ) : null}
                          {item.sku ? (
                            <span className="waiter-menu-v2__pill menu-v2__pill subtle">
                              SKU: {item.sku}
                            </span>
                          ) : null}
                          {unavailable ? (
                            <span className="waiter-menu-v2__pill menu-v2__pill alert">
                              Unavailable
                            </span>
                          ) : null}
                        </div>
                        <span className="waiter-menu-v2__price menu-v2__price">
                          {formatPrice(item.price)}
                        </span>
                      </div>

                      {displayDescription ? (
                        <p className="waiter-menu-v2__text menu-v2__text">{displayDescription}</p>
                      ) : (
                        <p className="waiter-menu-v2__text menu-v2__text muted">
                          No description provided.
                        </p>
                      )}
                      {item.notes ? (
                        <p className="waiter-menu-v2__text menu-v2__text muted">
                          Notes: {item.notes}
                        </p>
                      ) : null}

                      <div className="waiter-menu-v2__meta menu-v2__meta">
                        {item.prepTime ? (
                          <span className="waiter-menu-v2__pill menu-v2__pill">
                            Prep: {item.prepTime}
                          </span>
                        ) : null}
                        {item.spiceLevel ? (
                          <span className="waiter-menu-v2__pill menu-v2__pill warm">
                            Spice: {item.spiceLevel}
                          </span>
                        ) : null}
                        {listify(item.ingredients) ? (
                          <span className="waiter-menu-v2__pill menu-v2__pill">
                            {listify(item.ingredients)}
                          </span>
                        ) : null}
                      </div>

                      <div className="waiter-menu-v2__actions menu-v2__actions">
                        {cart[itemKey]?.qty ? (
                          <div className="qty-chip small">
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
                            className="waiter-menu-v2__btn menu-v2__btn primary small"
                            onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                            disabled={unavailable}
                          >
                            {unavailable ? "Out of stock" : "Add to order"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
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

      <div className={`summary-fab ${cartItems.length ? "has-items" : ""}`}>
        <button type="button" className="primary-btn" onClick={() => setIsSummaryOpen((open) => !open)}>
          {isSummaryOpen ? "Close Summary" : "Open Summary"}
          {cartItems.length ? ` (${cartItems.length})` : ""}
        </button>
      </div>

      {isSummaryOpen ? (
        <div className="summary-overlay" onClick={() => setIsSummaryOpen(false)}>
          <div className="summary-drawer" onClick={(e) => e.stopPropagation()}>
            {renderSummaryContent()}
            <button className="ghost-btn close-drawer-btn" onClick={() => setIsSummaryOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
