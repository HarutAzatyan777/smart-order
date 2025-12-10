import "./AdminDashboard.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/api";

const ACTIVE_STATUSES = new Set(["new", "submitted", "accepted", "preparing", "ready", "delivered"]);
const CLOSED_STATUSES = new Set(["closed", "cancelled", "canceled"]);

export default function AdminDashboard() {
  const navigate = useNavigate();

  const WAITER_API = apiUrl("admin/waiters");
  const ORDERS_API = apiUrl("admin/orders");
  const MENU_API = apiUrl("admin/menu");

  const token = localStorage.getItem("adminToken");

  const [waiters, setWaiters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  // menu fields
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");

  // edit menu fields
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPrice, setEditMenuPrice] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");

  const [menuSearch, setMenuSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("active");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState({
    waiters: false,
    menu: false,
    orders: false,
    refresh: false
  });
  const [waiterAction, setWaiterAction] = useState(false);
  const [menuActionId, setMenuActionId] = useState("");
  const [orderActionId, setOrderActionId] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }

    refreshAll();
  }, [token, navigate]);

  const withAuth = (options = {}) => ({
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const refreshAll = async () => {
    setLoading((prev) => ({ ...prev, refresh: true }));
    await Promise.all([loadWaiters(), loadMenu(), loadOrders()]);
    setLoading((prev) => ({ ...prev, refresh: false }));
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login");
  };

  // ========================= LOADERS ========================= //

  const loadWaiters = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, waiters: true }));
    try {
      setError("");
      const data = await fetchJson(WAITER_API, withAuth(), "Cannot load waiter list");
      setWaiters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setWaiters([]);
      setError(err.message || "Cannot load waiter list");
    } finally {
      setLoading((prev) => ({ ...prev, waiters: false }));
    }
  };

  const loadOrders = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, orders: true }));
    try {
      setError("");
      const data = await fetchJson(ORDERS_API, withAuth(), "Cannot load orders");
      const normalized = Array.isArray(data) ? data.map(normalizeOrder) : [];
      setOrders(normalized);
    } catch (err) {
      console.error(err);
      setOrders([]);
      setError(err.message || "Cannot load orders");
    } finally {
      setLoading((prev) => ({ ...prev, orders: false }));
    }
  };

  const loadMenu = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, menu: true }));
    try {
      setError("");
      const data = await fetchJson(MENU_API, withAuth(), "Cannot load menu");
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, price: Number(item.price) || 0 }))
        : [];
      setMenu(normalized);
    } catch (err) {
      console.error(err);
      setMenu([]);
      setError(err.message || "Cannot load menu");
    } finally {
      setLoading((prev) => ({ ...prev, menu: false }));
    }
  };

  // ========================= WAITERS ========================= //

  const addWaiter = async () => {
    if (!name.trim() || !pin.trim()) {
      setError("Name and PIN required");
      return;
    }

    try {
      setWaiterAction(true);
      setError("");
      await fetchJson(
        WAITER_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), pin: pin.trim() })
        }),
        "Could not add waiter"
      );
      setName("");
      setPin("");
      loadWaiters();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not add waiter");
    } finally {
      setWaiterAction(false);
    }
  };

  const deleteWaiter = async (id) => {
    const target = waiters.find((w) => w.id === id);
    const label = target?.name || "this waiter";
    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      setWaiterAction(true);
      await fetchJson(`${WAITER_API}/${id}`, withAuth({ method: "DELETE" }), "Could not delete waiter");
      loadWaiters();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not delete waiter");
    } finally {
      setWaiterAction(false);
    }
  };

  // ========================= MENU CRUD ========================= //

  const addMenuItem = async () => {
    if (!menuName.trim() || !menuPrice || !menuCategory.trim()) {
      setError("Menu name, price, and category required");
      return;
    }

    const payload = {
      name: menuName.trim(),
      price: Number(menuPrice),
      category: menuCategory.trim(),
      description: menuDescription.trim(),
      available: true
    };

    try {
      setMenuActionId("new");
      setError("");
      await fetchJson(
        MENU_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not add menu item"
      );

      setMenuName("");
      setMenuPrice("");
      setMenuCategory("");
      setMenuDescription("");
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not add menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const startEditMenuItem = (item) => {
    setEditingMenuId(item.id);
    setEditMenuName(item.name);
    setEditMenuPrice(item.price);
    setEditMenuCategory(item.category);
    setEditMenuDescription(item.description || "");
  };

  const cancelEditMenuItem = () => {
    setEditingMenuId(null);
    setEditMenuName("");
    setEditMenuPrice("");
    setEditMenuCategory("");
    setEditMenuDescription("");
  };

  const saveMenuItem = async () => {
    if (!editingMenuId) return;

    if (!editMenuName.trim() || !editMenuPrice || !editMenuCategory.trim()) {
      setError("Menu name, price, and category required");
      return;
    }

    const payload = {
      name: editMenuName.trim(),
      price: Number(editMenuPrice),
      category: editMenuCategory.trim(),
      description: editMenuDescription.trim()
    };

    try {
      setMenuActionId(editingMenuId);
      setError("");
      await fetchJson(
        `${MENU_API}/${editingMenuId}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not update menu item"
      );
      cancelEditMenuItem();
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const toggleMenuAvailability = async (item) => {
    try {
      setMenuActionId(item.id);
      await fetchJson(
        `${MENU_API}/${item.id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available: item.available === false ? true : false })
        }),
        "Could not update availability"
      );
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update availability");
    } finally {
      setMenuActionId("");
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete menu item?")) return;

    try {
      setMenuActionId(id);
      await fetchJson(`${MENU_API}/${id}`, withAuth({ method: "DELETE" }), "Could not delete menu item");
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not delete menu item");
    } finally {
      setMenuActionId("");
    }
  };

  // ========================= ORDERS ========================= //

  const updateOrderStatus = async (id, status) => {
    try {
      setOrderActionId(id);
      setError("");
      await fetchJson(
        `${ORDERS_API}/${id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }),
        "Could not update order"
      );
      loadOrders();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update order");
    } finally {
      setOrderActionId("");
    }
  };

  // ========================= DERIVED ========================= //

  const filteredMenu = useMemo(() => {
    const term = menuSearch.trim().toLowerCase();
    if (!term) return menu;
    return menu.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      return name.includes(term) || desc.includes(term) || cat.includes(term);
    });
  }, [menu, menuSearch]);

  const categories = useMemo(() => {
    const set = new Set(filteredMenu.map((m) => m.category || "Uncategorized"));
    return Array.from(set).sort();
  }, [filteredMenu]);

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();

    return [...orders]
      .filter((o) => {
        if (orderFilter === "active" && CLOSED_STATUSES.has(o.status)) return false;
        if (orderFilter === "ready" && o.status !== "ready") return false;
        if (!term) return true;

        const haystack = [
          String(o.table || "").toLowerCase(),
          String(o.waiterName || "").toLowerCase(),
          String(o.status || "").toLowerCase(),
          String(o.notes || "").toLowerCase()
        ];

        if (Array.isArray(o.items)) {
          haystack.push(
            o.items
              .map((i) => (i?.name || i || "").toString().toLowerCase())
              .join(" ")
          );
        }

        return haystack.some((value) => value.includes(term));
      })
      .sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.getTime() : 0;
        const tB = b.createdAt ? b.createdAt.getTime() : 0;
        return tB - tA;
      });
  }, [orders, orderFilter, orderSearch]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
    const readyOrders = orders.filter((o) => o.status === "ready").length;
    const closedOrders = orders.filter((o) => CLOSED_STATUSES.has(o.status)).length;
    const availableMenu = menu.filter((m) => m.available !== false).length;
    const categoriesCount = new Set(menu.map((m) => m.category || "Uncategorized")).size;

    return {
      waiters: waiters.length,
      orders: orders.length,
      activeOrders,
      readyOrders,
      closedOrders,
      menuCount: menu.length,
      availableMenu,
      categories: categoriesCount
    };
  }, [orders, menu, waiters]);

  // ========================= RENDER ========================= //

  return (
    <div className="admin-dashboard">
      <header className="admin-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="hero-title">Command center</h1>
          <p className="muted">
            Manage staff, menu, and orders from one dashboard. Data is pulled live from the API.
          </p>
          <div className="hero-actions">
            <button className="ghost-btn" onClick={refreshAll} disabled={loading.refresh}>
              {loading.refresh ? "Refreshing..." : "Refresh data"}
            </button>
            <span className="pill live-chip">Secured with admin token</span>
            <button className="danger-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="Active orders" value={stats.activeOrders} hint="New, accepted, prep" />
          <StatCard label="Menu items" value={stats.menuCount} hint={`${stats.categories} categories`} />
          <StatCard label="Waiters" value={stats.waiters} hint="Onboarded staff" />
          <StatCard label="Ready for pickup" value={stats.readyOrders} hint="Orders marked ready" />
        </div>
      </header>

      {error ? <div className="admin-alert">{error}</div> : null}

      <div className="panel-grid">
        {/* Waiters */}
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow soft">Team</p>
              <h2>Waiters</h2>
              <p className="muted">Add new staff or remove logins instantly.</p>
            </div>
            <div className="panel-actions">
              <button className="ghost-btn" onClick={loadWaiters} disabled={loading.waiters}>
                {loading.waiters ? "Loading..." : "Reload"}
              </button>
            </div>
          </div>

          <div className="input-grid">
            <div className="field">
              <label>Waiter name</label>
              <input
                className="admin-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>PIN</label>
              <input
                className="admin-input"
                placeholder="4+ digits"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>
            <button className="primary-btn" onClick={addWaiter} disabled={waiterAction}>
              {waiterAction ? "Saving..." : "Add waiter"}
            </button>
          </div>

          <div className="list-grid">
            {loading.waiters ? (
              <div className="skeleton-row">Loading waiters...</div>
            ) : waiters.length === 0 ? (
              <div className="empty-state">No waiters yet. Add your team to start.</div>
            ) : (
              waiters.map((w) => (
                <div key={w.id} className="waiter-card">
                  <div>
                    <p className="waiter-name">{w.name}</p>
                    <p className="muted small">PIN: {w.pin}</p>
                  </div>
                  <button
                    className="danger-btn"
                    onClick={() => deleteWaiter(w.id)}
                    disabled={waiterAction}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Menu */}
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow soft">Menu</p>
              <h2>Menu management</h2>
              <p className="muted">Create, edit, and toggle availability by category.</p>
            </div>
            <div className="panel-actions">
              <input
                className="admin-input compact"
                type="search"
                placeholder="Search menu"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />
              <button className="ghost-btn" onClick={loadMenu} disabled={loading.menu}>
                {loading.menu ? "Loading..." : "Reload"}
              </button>
            </div>
          </div>

          <div className="input-grid">
            <div className="field">
              <label>Item name</label>
              <input
                className="admin-input"
                placeholder="Spicy Margherita"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Price (AMD)</label>
              <input
                className="admin-input"
                placeholder="3500"
                type="number"
                value={menuPrice}
                onChange={(e) => setMenuPrice(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Category</label>
              <input
                className="admin-input"
                placeholder="Drinks, Pizza..."
                value={menuCategory}
                onChange={(e) => setMenuCategory(e.target.value)}
              />
            </div>
            <div className="field full">
              <label>Description</label>
              <textarea
                className="admin-textarea"
                rows="2"
                placeholder="Add a short description"
                value={menuDescription}
                onChange={(e) => setMenuDescription(e.target.value)}
              />
            </div>
            <button className="primary-btn" onClick={addMenuItem} disabled={menuActionId === "new"}>
              {menuActionId === "new" ? "Saving..." : "Add menu item"}
            </button>
          </div>

          {loading.menu ? (
            <div className="skeleton-row">Loading menu...</div>
          ) : categories.length === 0 ? (
            <div className="empty-state">No menu items yet. Add your first dish.</div>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="category-block">
                <div className="category-header">
                  <h3>{cat}</h3>
                  <span className="pill subtle">
                    {filteredMenu.filter((m) => (m.category || "Uncategorized") === cat).length} items
                  </span>
                </div>
                <div className="menu-grid">
                  {filteredMenu
                    .filter((m) => (m.category || "Uncategorized") === cat)
                    .map((item) => (
                      <div key={item.id} className="admin-menu-card">
                        {editingMenuId === item.id ? (
                          <div className="edit-grid">
                            <input
                              className="admin-input"
                              value={editMenuName}
                              onChange={(e) => setEditMenuName(e.target.value)}
                              placeholder="Item name"
                            />
                            <input
                              className="admin-input"
                              type="number"
                              value={editMenuPrice}
                              onChange={(e) => setEditMenuPrice(e.target.value)}
                              placeholder="Price"
                            />
                            <input
                              className="admin-input"
                              value={editMenuCategory}
                              onChange={(e) => setEditMenuCategory(e.target.value)}
                              placeholder="Category"
                            />
                            <textarea
                              className="admin-textarea"
                              value={editMenuDescription}
                              onChange={(e) => setEditMenuDescription(e.target.value)}
                              placeholder="Description"
                            />
                            <div className="menu-actions">
                              <button
                                className="primary-btn"
                                onClick={saveMenuItem}
                                disabled={menuActionId === item.id}
                              >
                                {menuActionId === item.id ? "Saving..." : "Save"}
                              </button>
                              <button className="ghost-btn" onClick={cancelEditMenuItem}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="menu-card-top">
                              <div>
                                <p className="muted small">{item.category || "Uncategorized"}</p>
                                <h4>{item.name}</h4>
                                <p className="price">{formatCurrency(item.price)}</p>
                              </div>
                              <span
                                className={`status-chip ${item.available === false ? "status-muted" : "status-live"}`}
                              >
                                {item.available === false ? "Unavailable" : "Available"}
                              </span>
                            </div>
                            <p className="muted">{item.description || "No description provided."}</p>
                            <div className="menu-actions">
                              <button className="ghost-btn" onClick={() => startEditMenuItem(item)}>
                                Edit
                              </button>
                              <button
                                className="outline-btn"
                                onClick={() => toggleMenuAvailability(item)}
                                disabled={menuActionId === item.id}
                              >
                                {menuActionId === item.id
                                  ? "Updating..."
                                  : item.available === false
                                  ? "Mark available"
                                  : "Mark unavailable"}
                              </button>
                              <button
                                className="danger-btn"
                                onClick={() => deleteMenuItem(item.id)}
                                disabled={menuActionId === item.id}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Orders */}
      <section className="admin-panel wide">
        <div className="panel-heading">
          <div>
            <p className="eyebrow soft">Orders</p>
            <h2>Order review</h2>
            <p className="muted">Search, filter, and intervene when needed.</p>
          </div>
          <div className="panel-actions">
            <div className="filter-group">
              {["active", "ready", "all"].map((key) => (
                <button
                  key={key}
                  className={`pill-btn ${orderFilter === key ? "active" : ""}`}
                  onClick={() => setOrderFilter(key)}
                >
                  {key === "active" ? "Active" : key === "ready" ? "Ready" : "All"}
                </button>
              ))}
            </div>
            <input
              className="admin-input compact"
              type="search"
              placeholder="Search by table, waiter, status, or item"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            <button className="ghost-btn" onClick={loadOrders} disabled={loading.orders}>
              {loading.orders ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        {loading.orders ? (
          <div className="skeleton-row">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">No orders match your filters right now.</div>
        ) : (
          <div className="orders-grid">
            {filteredOrders.map((o) => {
              const age = getAgeLabel(o.createdAt);
              const actions = getAdminOrderActions(o.status);
              return (
                <article key={o.id} className={`admin-order-card${isLagging(o) ? " overdue" : ""}`}>
                  <div className="order-card-header">
                    <div>
                      <p className="muted small">Table</p>
                      <p className="order-table">{o.table || "-"}</p>
                      <div className="meta-row">
                        {o.waiterName ? <span className="pill subtle">Waiter: {o.waiterName}</span> : null}
                        <span className="pill light">{getItemCount(o.items)} items</span>
                        {age ? <span className="age-chip">{age}</span> : null}
                      </div>
                    </div>
                    <span className={`status-chip status-${o.status || "new"}`}>
                      {formatStatus(o.status)}
                    </span>
                  </div>

                  {Array.isArray(o.items) && o.items.length ? (
                    <div className="order-items">
                      <p className="order-label">Items</p>
                      <ul>
                        {o.items.map((item, idx) => (
                          <li key={idx}>
                            <span>{item?.name || item}</span>
                            {item?.qty ? <span className="item-qty">x{item.qty}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="muted small">No items captured.</p>
                  )}

                  {o.notes ? (
                    <div className="note-box">
                      <p className="order-label">Notes</p>
                      <p>{o.notes}</p>
                    </div>
                  ) : null}

                  <div className="order-actions">
                    {actions.length === 0 ? (
                      <span className="pill subtle">No admin actions</span>
                    ) : (
                      actions.map((action) => (
                        <button
                          key={action.status}
                          className={action.tone || "outline-btn"}
                          disabled={orderActionId === o.id}
                          onClick={() => updateOrderStatus(o.id, action.status)}
                        >
                          {orderActionId === o.id ? "Updating..." : action.label}
                        </button>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function getAdminOrderActions(status) {
  const normalized = normalizeStatus(status);
  if (CLOSED_STATUSES.has(normalized)) return [];

  const actions = [];
  if (normalized !== "closed") actions.push({ label: "Close order", status: "closed" });
  if (normalized !== "cancelled") {
    actions.push({ label: "Cancel order", status: "cancelled", tone: "danger-btn" });
  }

  return actions;
}

function normalizeStatus(status) {
  if (!status) return "new";
  return String(status).toLowerCase();
}

function normalizeOrder(order) {
  const createdAt =
    normalizeTimestamp(order.createdAt) || normalizeTimestamp(order.timestamps?.createdAt);

  return {
    ...order,
    status: normalizeStatus(order.status),
    createdAt,
    items: Array.isArray(order.items) ? order.items : []
  };
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch (err) {
      console.error("Timestamp parse error:", err);
    }
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
  }

  if (typeof value._seconds === "number") {
    return new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6));
  }

  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) return asDate;
  return null;
}

function fetchJson(url, options, fallbackMessage) {
  return fetch(url, options).then(async (res) => {
    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || fallbackMessage || "Request failed");
    }

    return data;
  });
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return `${number.toLocaleString("en-US")} AMD`;
}

function getItemCount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item?.qty || 1), 0);
}

function getAgeLabel(date) {
  if (!date?.getTime) return null;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours}h${rem ? ` ${rem}m` : ""} ago`;
}

function isLagging(order) {
  if (!order?.createdAt?.getTime) return false;
  return Date.now() - order.createdAt.getTime() > 15 * 60 * 1000;
}

function formatStatus(status) {
  const normalized = normalizeStatus(status);
  const map = {
    new: "New",
    submitted: "Submitted",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    delivered: "Delivered",
    closed: "Closed",
    cancelled: "Cancelled",
    canceled: "Cancelled"
  };
  return map[normalized] || normalized;
}

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <strong>{value}</strong>
      <span className="stat-hint">{hint}</span>
    </div>
  );
}
