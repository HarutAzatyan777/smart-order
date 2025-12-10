import { useState } from "react";
import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import { updateOrderStatus } from "../../api/ordersApi";
import "./KitchenDashboard.css";

export default function KitchenDashboard() {
  const orders = useOrdersRealtime();
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const handleUpdate = async (id, status) => {
    try {
      setLoadingId(id);
      setError(null);
      await updateOrderStatus(id, status);
    } catch (err) {
      console.error("Status update error:", err);
      setError("Failed to update status");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="kitchen-dashboard">
      <h1 className="kitchen-title">Kitchen Dashboard</h1>

      {error && <p className="error-message">{error}</p>}

      <Section
        title="Incoming Orders"
        orders={orders}
        filter="new"
        handleUpdate={handleUpdate}
        actions={[{ label: "Accept Order", status: "accepted" }]}
      />

      <Section
        title="Accepted"
        orders={orders}
        filter="accepted"
        handleUpdate={handleUpdate}
        actions={[{ label: "Start Preparing", status: "preparing" }]}
      />

      <Section
        title="Preparing"
        orders={orders}
        filter="preparing"
        handleUpdate={handleUpdate}
        actions={[{ label: "Mark as Ready", status: "ready" }]}
      />

      <Section
        title="Ready"
        orders={orders}
        filter="ready"
        handleUpdate={handleUpdate}
        actions={[{ label: "Deliver to Table", status: "delivered" }]}
      />

      <Section
        title="Delivered"
        orders={orders}
        filter="delivered"
        handleUpdate={handleUpdate}
        actions={[{ label: "Close Order", status: "closed" }]}
      />
    </div>
  );
}

/* ===============================
   Section Component
=============================== */
function Section({ title, orders, filter, handleUpdate, actions }) {
  const filtered = orders.filter((o) => o.status === filter);
  if (filtered.length === 0) return null;

  return (
    <>
      <h2 className="section-title">{title}</h2>

      {filtered.map((o) => (
        <OrderCard
          key={o.id}
          order={o}
          onAction={handleUpdate}
          actions={actions}
        />
      ))}
    </>
  );
}

/* ===============================
   Order Card Component
=============================== */
function OrderCard({ order, onAction, actions }) {
  return (
    <div className="order-card">
      <div className="order-info">
        <p>
          <strong>Table:</strong> {order.table}
        </p>

        <p>
          <strong>Items:</strong>
          <br />
          {order.items?.map((item, i) => (
            <span key={i}>
              {item.name} {item.qty ? `(x${item.qty})` : ""} <br />
            </span>
          ))}
        </p>

        <p>
          <strong>Status:</strong> {order.status}
        </p>
      </div>

      <div className="order-actions">
        {actions.map((action) => (
          <button
            key={action.status}
            onClick={() => onAction(order.id, action.status)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
