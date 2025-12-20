import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { updateOrderStatus } from "../../api/ordersApi";
import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import NotificationStack from "../../components/NotificationStack";
import useNotificationCenter from "../../hooks/useNotificationCenter";
import useOrderChangeAlerts from "../../hooks/useOrderChangeAlerts";
import "./WaiterHome.css";

const statusMeta = {
  new: { label: "New", color: "#0ea5e9" },
  accepted: { label: "Accepted", color: "#22c55e" },
  preparing: { label: "Preparing", color: "#f59e0b" },
  ready: { label: "Ready", color: "#0ea676" },
  delivered: { label: "Delivered", color: "#475569" },
  closed: { label: "Closed", color: "#3f3f46" },
  cancelled: { label: "Cancelled", color: "#dc2626" },
  submitted: { label: "Submitted", color: "#0284c7" }
};

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

function getItemCount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item?.qty || 1), 0);
}

function formatStatus(status) {
  if (!status) return "Pending";
  return statusMeta[status]?.label || status.charAt(0).toUpperCase() + status.slice(1);
}

function getWaiterActions(order) {
  const actions = [];

  if (order.status === "ready") {
    actions.push({ label: "Mark delivered", status: "delivered" });
  }

  if (order.status === "delivered") {
    actions.push({ label: "Close order", status: "closed", tone: "secondary" });
  }

  if (["new", "accepted"].includes(order.status)) {
    actions.push({ label: "Cancel order", status: "cancelled", tone: "danger" });
  }

  return actions;
}

export default function WaiterHome() {
  const {
    orders = [],
    loading: ordersLoading,
    error: ordersError,
    refresh: refreshOrders
  } = useOrdersRealtime() || {};

  const storedWaiterName = localStorage.getItem("waiterName") || "";
  const waiterId = localStorage.getItem("waiterId") || "";
  const displayWaiterName = storedWaiterName || "Waiter";

  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(Boolean(waiterId || storedWaiterName));
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");
  const { notifications, notify, dismiss } = useNotificationCenter();

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const shouldFilterByWaiter = onlyMine && (waiterId || storedWaiterName);

    return orders
      .filter((o) => {
        if (shouldFilterByWaiter) {
          const matchesId = waiterId && o.waiterId ? o.waiterId === waiterId : false;
          const matchesName =
            storedWaiterName && o.waiterName
              ? o.waiterName.toLowerCase() === storedWaiterName.toLowerCase()
              : false;

          if (!(matchesId || matchesName)) return false;
        }

        if (!term) return true;

        const haystack = [
          String(o.table || "").toLowerCase(),
          String(o.status || "").toLowerCase(),
          String(o.notes || "").toLowerCase(),
          String(o.waiterName || "").toLowerCase()
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
        const tA = a.createdAt?.getTime?.() || 0;
        const tB = b.createdAt?.getTime?.() || 0;
        return tB - tA;
      });
  }, [orders, search, onlyMine, waiterId, storedWaiterName]);

  const statusCounts = useMemo(() => {
    const counts = {};
    filteredOrders.forEach((o) => {
      const key = o.status || "new";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredOrders]);

  useEffect(() => {
    if (!waiterId || !storedWaiterName) {
      window.location.replace("/waiter");
    }
  }, [waiterId, storedWaiterName]);

  const handleLogout = () => {
    localStorage.removeItem("waiterId");
    localStorage.removeItem("waiterName");
    sessionStorage.setItem("waiterForceLogin", "1");
    window.location.replace("/waiter");
  };

  const handleStatusChange = async (id, status) => {
    if (!id) {
      setError("Order is missing an ID.");
      return;
    }

    try {
      setError("");
      setLoadingId(id);
      await updateOrderStatus(id, status);
      if (typeof refreshOrders === "function") {
        await refreshOrders();
      }
    } catch (err) {
      console.error("Update status error:", err);
      const msg = err?.response?.data?.error || "Could not update order.";
      setError(msg);
    } finally {
      setLoadingId(null);
    }
  };

  useOrderChangeAlerts(orders, notify, formatStatus);

  return (
    <div className="waiter-home-page">
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
      <header className="waiter-home-header">
        <div>
          <p className="eyebrow">Waiter console</p>
          <h1 className="page-title">Live orders</h1>
          <p className="muted">
            Track your tables, see status updates, and mark deliveries in real time.
          </p>
        </div>

        <div className="chip-group">
          <div className="waiter-chip">
            <span className="pill-label">On shift</span>
            <span>{displayWaiterName}</span>
          </div>

          <div className="header-buttons">
            <Link to="/waiter/menu" className="ghost-btn">
              Browse menu
            </Link>
            <Link to="/waiter/create" className="primary-link">
              New order
            </Link>
            <button type="button" className="danger-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="toolbar">
        <div className="search-box">
          <input
            type="search"
            placeholder="Search by table, status, item, or note"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button className="link-btn" onClick={() => setSearch("")}>
              Clear
            </button>
          ) : null}
        </div>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          <span>Only my orders{storedWaiterName ? ` (${displayWaiterName})` : ""}</span>
        </label>

        <span className="live-dot">Live (Firestore)</span>
      </div>

      <div className="status-cards">
        {Object.keys(statusMeta).map((key) => (
          <div key={key} className="status-card">
            <div>
              <p className="status-label">{statusMeta[key].label}</p>
              <strong>{statusCounts[key] || 0}</strong>
            </div>
            <span
              className="status-dot"
              style={{ background: statusMeta[key].color }}
            />
          </div>
        ))}
      </div>

      {(error || ordersError) && (
        <div className="alert error">
          <span>{error || ordersError}</span>
          {ordersError ? (
            <button className="link-btn" onClick={refreshOrders}>
              Retry loading orders
            </button>
          ) : (
            <button className="link-btn" onClick={() => setError("")}>
              Dismiss
            </button>
          )}
        </div>
      )}

      {ordersLoading ? (
        <div className="panel empty-panel">
          <p className="empty-title">Loading orders...</p>
          <p className="muted small">Fetching latest tables and tickets.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="panel empty-panel">
          <p className="empty-title">No orders match right now.</p>
          <p className="muted small">
            Adjust the filters or create a new table order.
          </p>
          <div className="header-buttons">
            <Link to="/waiter/create" className="primary-link">
              Create order
            </Link>
            <Link to="/waiter/menu" className="ghost-btn">
              Browse menu
            </Link>
          </div>
        </div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((o) => {
            const actions = getWaiterActions(o);
            const ageLabel = getAgeLabel(o.createdAt);
            const itemCount = getItemCount(o.items);

            return (
              <article key={o.id} className="waiter-order-card">
                <div className="card-top">
                  <div>
                    <p className="eyebrow">Table</p>
                    <p className="table-number">{o.table || "-"}</p>

                    <div className="meta-row">
                      {o.waiterName ? (
                        <span className="pill subtle">Waiter: {o.waiterName}</span>
                      ) : null}
                      {itemCount ? (
                        <span className="pill light">{itemCount} items</span>
                      ) : null}
                      {ageLabel ? <span className="age-pill">{ageLabel}</span> : null}
                    </div>
                  </div>

                  <span className={`status-chip status-${o.status || "new"}`}>
                    {formatStatus(o.status)}
                  </span>
                </div>

                <div className="order-items">
                  <p className="order-label">Items</p>
                  {Array.isArray(o.items) && o.items.length > 0 ? (
                    <ul className="order-items-list">
                      {o.items.map((item, idx) => (
                        <li key={idx}>
                          <span>{item?.name || item}</span>
                          {item?.qty ? (
                            <span className="item-qty">x{item.qty}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No items listed.</p>
                  )}
                </div>

                {o.notes ? (
                  <div className="note-box">
                    <p className="order-label">Notes</p>
                    <p className="muted">{o.notes}</p>
                  </div>
                ) : null}

                {actions.length > 0 ? (
                  <div className="card-actions">
                    {actions.map((action) => (
                      <button
                        key={action.status}
                        className={action.tone || ""}
                        disabled={loadingId === o.id}
                        onClick={() => handleStatusChange(o.id, action.status)}
                      >
                        {loadingId === o.id ? "Updating..." : action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
