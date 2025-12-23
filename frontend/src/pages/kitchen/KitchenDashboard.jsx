import { useMemo, useState } from "react";
import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import { updateOrderStatus } from "../../api/ordersApi";
import NotificationStack from "../../components/NotificationStack";
import useNotificationCenter from "../../hooks/useNotificationCenter";
import useOrderChangeAlerts from "../../hooks/useOrderChangeAlerts";
import "./KitchenDashboard.css";

const COLUMNS = [
  { key: "new", label: "New", actionLabel: "Start", next: "preparing", tone: "new" },
  { key: "preparing", label: "Preparing", actionLabel: "Ready", next: "ready", tone: "preparing" },
  { key: "ready", label: "Ready", actionLabel: "Complete", next: "delivered", tone: "ready" }
];

function normalizeStatus(status) {
  if (!status) return "new";
  if (status === "submitted" || status === "accepted") return "new";
  if (status === "canceled") return "cancelled";
  return status;
}

function getAgeLabel(date) {
  if (!date?.getTime) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins === 0) {
    const secs = Math.max(0, Math.floor(diffMs / 1000));
    return `${secs}s`;
  }
  return `${mins}m`;
}

function isNewArrival(order) {
  const ts = order?.createdAt?.getTime?.() || 0;
  return Date.now() - ts < 90 * 1000;
}

export default function KitchenDashboard() {
  const {
    orders = [],
    loading: ordersLoading,
    error: ordersError,
    refresh: refreshOrders
  } = useOrdersRealtime() || {};
  const { notifications, notify, dismiss } = useNotificationCenter();
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

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

  const grouped = useMemo(() => {
    const map = {
      new: [],
      preparing: [],
      ready: []
    };
    normalizedOrders.forEach((o) => {
      const key = map[o.status] ? o.status : null;
      if (key) map[key].push(o);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.getTime() : 0;
        const tB = b.createdAt ? b.createdAt.getTime() : 0;
        return tB - tA;
      });
    });
    return map;
  }, [normalizedOrders]);

  const counts = useMemo(
    () => ({
      new: grouped.new.length,
      preparing: grouped.preparing.length,
      ready: grouped.ready.length
    }),
    [grouped]
  );

  const handleAdvance = async (order, nextStatus) => {
    if (!order?.id || !nextStatus) return;
    try {
      setLoadingId(order.id);
      setError(null);
      await updateOrderStatus(order.id, nextStatus);
    } catch (err) {
      console.error("Status update error:", err);
      setError("Failed to update order. Please retry.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="kitchen-dashboard">
      <NotificationStack notifications={notifications} onDismiss={dismiss} />

      <header className="kitchen-header">
        <div>
          <p className="kitchen-eyebrow">KITCHEN</p>
          <h1 className="kitchen-title">Service Board</h1>
          <p className="kitchen-subtitle">Tap once to move tickets forward.</p>
        </div>
        <div className="kitchen-counts">
          <span className="count-badge new">New: {counts.new}</span>
          <span className="count-badge preparing">Prep: {counts.preparing}</span>
          <span className="count-badge ready">Ready: {counts.ready}</span>
          <span className="live-dot">Live</span>
        </div>
      </header>

      {(error || ordersError) && (
        <div className="error-message">
          <span>{error || ordersError}</span>
          <button className="link-btn" onClick={refreshOrders}>
            Retry
          </button>
        </div>
      )}

      <div className="kitchen-board">
        {COLUMNS.map((col) => (
          <div key={col.key} className={`k-column tone-${col.tone}`}>
            <div className="k-column-head">
              <h2>{col.label}</h2>
              <span className="k-column-count">{grouped[col.key]?.length || 0}</span>
            </div>
            <div className="k-column-body">
              {ordersLoading && grouped[col.key]?.length === 0 ? (
                <div className="k-empty">Loading orders...</div>
              ) : grouped[col.key]?.length ? (
                grouped[col.key].map((order) => {
                  const age = getAgeLabel(order.createdAt);
                  const itemList =
                    order.items?.map((i) => ({
                      name: i?.name || i,
                      qty: i?.qty || 1
                    })) || [];
                  const isFresh = isNewArrival(order);
                  const actionLabel =
                    col.key === "ready" ? "Complete" : col.actionLabel;

                  return (
                    <article
                      key={order.id}
                      className={`k-card ${isFresh ? "is-fresh" : ""}`}
                    >
                      <div className="k-card-top">
                        <div>
                          <p className="k-label">Table</p>
                          <p className="k-table">#{order.table}</p>
                        </div>
                        <div className="k-meta">
                          <span className="k-order-id">#{order.id?.slice(-5) || "--"}</span>
                          <span className="k-age">{age}</span>
                        </div>
                      </div>

                      <div className="k-items">
                        {itemList.map((item, idx) => (
                          <div key={idx} className="k-item">
                            <span className="k-item-name">{item.name}</span>
                            <span className="k-item-qty">x{item.qty}</span>
                          </div>
                        ))}
                      </div>

                      {order.notes ? (
                        <div className="k-notes">📝 {order.notes}</div>
                      ) : null}

                      <button
                        className="k-action"
                        onClick={() => handleAdvance(order, col.next)}
                        disabled={loadingId === order.id || !col.next}
                      >
                        {loadingId === order.id ? "Updating..." : actionLabel}
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className="k-empty">No orders</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
