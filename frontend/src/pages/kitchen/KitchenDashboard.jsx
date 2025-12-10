import { useMemo, useState } from "react";
import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import { updateOrderStatus } from "../../api/ordersApi";
import "./KitchenDashboard.css";

const statusConfig = [
  { key: "new", label: "Incoming" },
  { key: "accepted", label: "Accepted" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "closed", label: "Closed" }
];

export default function KitchenDashboard() {
  const orders = useOrdersRealtime() || [];
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((o) => {
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
  }, [orders, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = statusConfig.reduce((acc, cur) => ({ ...acc, [cur.key]: 0 }), {});
    filteredOrders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status] += 1;
    });
    return counts;
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
      <div className="kitchen-top">
        <div className="kitchen-top-left">
          <div>
            <h1 className="kitchen-title">Kitchen Dashboard</h1>
            <p className="kitchen-subtitle">Track and advance every order in real time.</p>
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

        <div className="status-pills">
          {statusConfig.map((status) => (
            <div key={status.key} className="status-pill">
              <span className="pill-label">{status.label}</span>
              <span className="pill-count">{statusCounts[status.key] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="sections-wrap">
        {statusConfig.map((status) => (
          <Section
            key={status.key}
            title={status.label}
            orders={filteredOrders}
            filter={status.key}
            handleUpdate={handleUpdate}
            loadingId={loadingId}
            actions={getActionsForStatus(status.key)}
          />
        ))}
      </div>
    </div>
  );
}

function getActionsForStatus(status) {
  const map = {
    new: [{ label: "Accept Order", status: "accepted" }],
    accepted: [{ label: "Start Preparing", status: "preparing" }],
    preparing: [{ label: "Mark as Ready", status: "ready" }],
    ready: [{ label: "Deliver to Table", status: "delivered" }],
    delivered: [{ label: "Close Order", status: "closed" }],
    closed: []
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
function Section({ title, orders, filter, handleUpdate, actions, loadingId }) {
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
        <h2 className="section-title">{title}</h2>
        <span className="section-count">{filtered.length} orders</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No orders in this stage right now.</div>
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
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (item.qty || 1), 0)
    : 0;

  const isLagging =
    order.createdAt && Date.now() - order.createdAt.getTime() > 15 * 60 * 1000;

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
