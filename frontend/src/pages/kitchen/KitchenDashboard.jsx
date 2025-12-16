import { useMemo, useState } from "react";
import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import { updateOrderStatus } from "../../api/ordersApi";
import NotificationStack from "../../components/NotificationStack";
import useNotificationCenter from "../../hooks/useNotificationCenter";
import useOrderChangeAlerts from "../../hooks/useOrderChangeAlerts";
import "./KitchenDashboard.css";

const statusConfig = [
  { key: "submitted", label: "Submitted", helper: "New from waiter app", isActive: true },
  { key: "new", label: "Incoming", helper: "Awaiting acknowledgement", isActive: true },
  { key: "accepted", label: "Accepted", helper: "Ticket acknowledged", isActive: true },
  { key: "preparing", label: "Preparing", helper: "On the line", isActive: true },
  { key: "ready", label: "Ready", helper: "Pass to runner", isActive: true },
  { key: "delivered", label: "Delivered", helper: "Runner has table", isActive: false },
  { key: "closed", label: "Closed", helper: "Fully settled", isActive: false },
  { key: "cancelled", label: "Cancelled", helper: "Void or comped", isActive: false }
];

function normalizeStatus(status) {
  if (!status) return "new";
  if (status === "canceled") return "cancelled";
  return status;
}

function isOrderLagging(order) {
  const ts = order?.createdAt;
  const t = ts instanceof Date ? ts.getTime() : Number(new Date(ts));
  if (!t || Number.isNaN(t)) return false;
  return Date.now() - t > 15 * 60 * 1000;
}

export default function KitchenDashboard() {
  const { orders = [], loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useOrdersRealtime() || {};
  const { notifications, notify, dismiss } = useNotificationCenter();
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewFilter, setViewFilter] = useState("all");

  const normalizedOrders = useMemo(
    () =>
      orders.map((o) => {
        const createdAt =
          o?.createdAt instanceof Date ? o.createdAt : new Date(o?.createdAt);
        return {
          ...o,
          createdAt: Number.isNaN(createdAt?.getTime()) ? null : createdAt,
          status: normalizeStatus(o.status)
        };
      }),
    [orders]
  );

  useOrderChangeAlerts(normalizedOrders, notify);

  const visibleStatuses = useMemo(() => {
    if (viewFilter === "all") return statusConfig;
    return statusConfig.filter((s) => s.isActive !== false);
  }, [viewFilter]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const visibleKeys = new Set(visibleStatuses.map((s) => s.key));

    return normalizedOrders.filter((o) => {
      if (!visibleKeys.has(o.status)) return false;

      if (!term) return true;

      const items = o.items
        ?.map((i) => i?.name || i)
        .join(" ")
        .toLowerCase() || "";
      const notes = o.notes?.toLowerCase() || "";
      const waiter = o.waiterName?.toLowerCase() || "";
      return (
        String(o.table).toLowerCase().includes(term) ||
        items.includes(term) ||
        notes.includes(term) ||
        waiter.includes(term)
      );
    });
  }, [normalizedOrders, searchTerm, visibleStatuses]);

  const statusCounts = useMemo(() => {
    const counts = statusConfig.reduce((acc, cur) => ({ ...acc, [cur.key]: 0 }), {});
    filteredOrders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status] += 1;
    });
    return counts;
  }, [filteredOrders]);

  const kpis = useMemo(() => {
    const activeKeys = new Set(statusConfig.filter((s) => s.isActive !== false).map((s) => s.key));
    let overdue = 0;
    let ready = 0;
    let active = 0;

    filteredOrders.forEach((order) => {
      if (activeKeys.has(order.status)) active += 1;
      if (order.status === "ready") ready += 1;
      if (isOrderLagging(order)) overdue += 1;
    });

    return {
      total: filteredOrders.length,
      active,
      ready,
      overdue
    };
  }, [filteredOrders]);

  const handleUpdate = async (id, status) => {
    try {
      setLoadingId(id);
      setError(null);
      await updateOrderStatus(id, status);
    } catch (err) {
      console.error("Status update error:", err);
      setError("Failed to update status. Please retry.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="kitchen-dashboard">
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
      <div className="kitchen-top">
        <div className="kitchen-top-left">
          <div>
            <h1 className="kitchen-title">Kitchen Dashboard</h1>
            <p className="kitchen-subtitle">Track and advance every order in real time.</p>
            <div className="top-meta">
              <span className="live-dot">Live</span>
              <span className="pill subtle">Firestore realtime feed</span>
            </div>
          </div>

          <div className="search-box">
            <input
              type="search"
              placeholder="Search by table, item, waiter, or note"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="link-btn" onClick={() => setSearchTerm("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="kitchen-top-right">
          <div className="view-toggle">
            <button
              className={viewFilter === "active" ? "active" : ""}
              onClick={() => setViewFilter("active")}
            >
              Active
            </button>
            <button
              className={viewFilter === "all" ? "active" : ""}
              onClick={() => setViewFilter("all")}
            >
              All statuses
            </button>
          </div>

          <div className="status-pills">
            {visibleStatuses.map((status) => (
              <div key={status.key} className="status-pill">
                <div>
                  <span className="pill-label">{status.label}</span>
                  {status.helper ? <p className="pill-helper">{status.helper}</p> : null}
                </div>
                <span className="pill-count">{statusCounts[status.key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(error || ordersError) && (
        <div className="error-message">
          <span>{error || ordersError}</span>
          <button className="link-btn" onClick={refreshOrders}>
            Retry
          </button>
        </div>
      )}
      {ordersLoading ? <div className="skeleton-row">Loading orders...</div> : null}

      <div className="kpi-grid">
        <div className="kpi-card">
          <p className="kpi-label">Tickets on deck</p>
          <strong>{kpis.active}</strong>
          <span className="kpi-hint">New, accepted, or in prep</span>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Ready for pickup</p>
          <strong>{kpis.ready}</strong>
          <span className="kpi-hint">Hand off to runners</span>
        </div>
        <div className={`kpi-card${kpis.overdue ? " alert" : ""}`}>
          <p className="kpi-label">Lagging tickets</p>
          <strong>{kpis.overdue}</strong>
          <span className="kpi-hint">Over 15 minutes old</span>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Visible tickets</p>
          <strong>{kpis.total}</strong>
          <span className="kpi-hint">After search & filter</span>
        </div>
      </div>

      <div className="sections-wrap">
        {visibleStatuses.map((status) => (
          <Section
            key={status.key}
            title={status.label}
            orders={filteredOrders}
            filter={status.key}
            handleUpdate={handleUpdate}
            loadingId={loadingId}
            actions={getActionsForStatus(status.key)}
            helper={status.helper}
            loading={ordersLoading}
          />
        ))}
      </div>
    </div>
  );
}

function getActionsForStatus(status) {
  const map = {
    submitted: [{ label: "Accept Order", status: "accepted" }],
    new: [{ label: "Accept Order", status: "accepted" }],
    accepted: [{ label: "Start Preparing", status: "preparing" }],
    preparing: [{ label: "Mark as Ready", status: "ready" }],
    ready: [{ label: "Deliver to Table", status: "delivered" }],
    delivered: [{ label: "Close Order", status: "closed" }],
    closed: [],
    cancelled: []
  };

  return map[status] || [];
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

/* ===============================
   Section Component
=============================== */
function Section({ title, helper, orders, filter, handleUpdate, actions, loadingId, loading }) {
  const filtered = [...orders]
    .filter((o) => o.status === filter)
    .sort((a, b) => {
      const tA = a.createdAt ? a.createdAt.getTime() : 0;
      const tB = b.createdAt ? b.createdAt.getTime() : 0;
      return tB - tA;
    });

  return (
    <section className="kitchen-section">
      <div className="section-heading">
        <div>
          <h2 className="section-title">{title}</h2>
          {helper ? <p className="section-helper">{helper}</p> : null}
        </div>
        <span className="section-count">{filtered.length} orders</span>
      </div>

      {loading ? (
        <div className="empty-state">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          No orders in this stage right now.
          {filter !== "all" ? (
            <p className="muted small">Switch to "All statuses" to see closed orders.</p>
          ) : null}
        </div>
      ) : (
        <div className="order-grid">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onAction={handleUpdate}
              actions={actions}
              loadingId={loadingId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ===============================
   Order Card Component
=============================== */
function OrderCard({ order, onAction, actions, loadingId }) {
  const isUpdating = loadingId === order.id;
  const ageLabel = getAgeLabel(order.createdAt);
  const createdLabel = order.createdAt
    ? order.createdAt.toLocaleString()
    : "No timestamp";
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (item.qty || 1), 0)
    : 0;

  const isLagging = isOrderLagging(order);

  return (
    <div className={`order-card${isLagging ? " overdue" : ""}`}>
      <div className="order-card-header">
        <div>
          <p className="order-label">Table</p>
          <p className="order-value">{order.table}</p>

          <div className="meta-row">
            {order.waiterName ? (
              <span className="pill subtle">Waiter: {order.waiterName}</span>
            ) : null}
            {itemCount ? (
              <span className="pill light">{itemCount} items</span>
            ) : null}
            {ageLabel ? <span className="age-pill">{ageLabel}</span> : null}
            <span className="pill ghost">Created: {createdLabel}</span>
          </div>
        </div>
        <span className={`status-chip status-${order.status}`}>{order.status}</span>
      </div>

      <div className="order-items">
        <p className="order-label">Items</p>
        {order.items?.length ? (
          <ul>
            {order.items.map((item, i) => (
              <li key={i}>
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

      {order.notes ? (
        <div className="note-box">
          <p className="order-label">Notes</p>
          <p>{order.notes}</p>
        </div>
      ) : null}

      <div className="order-actions">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => onAction(order.id, action.status)}
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
