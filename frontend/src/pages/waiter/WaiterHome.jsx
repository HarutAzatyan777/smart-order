import { Link } from "react-router-dom";
import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import "./WaiterHome.css";

export default function WaiterHome() {
  const orders = useOrdersRealtime() || [];

  // Sort newest → oldest
  const sorted = [...orders].sort((a, b) => {
    const tA = a.createdAt ? a.createdAt.getTime() : 0;
    const tB = b.createdAt ? b.createdAt.getTime() : 0;
    return tB - tA;
  });

  return (
    <div className="waiter-home">
      <h2 className="waiter-title">Your Orders</h2>

      <Link to="/waiter/create" className="create-order-btn">
        Create New Order
      </Link>

      {/* EMPTY STATE */}
      {sorted.length === 0 && (
        <p className="empty-message">No orders yet.</p>
      )}

      {/* ORDER CARDS */}
      {sorted.map((o) => (
        <div key={o.id} className="order-card">

          <p>
            <strong>Table:</strong> {o.table}
          </p>

          <p>
            <strong>Status:</strong> {o.status}
          </p>

          {/* NEW FORMAT: item.name + qty */}
          {Array.isArray(o.items) && o.items.length > 0 && (
            <p className="order-items">
              <strong>Items:</strong>{" "}
              {o.items
                .map((i) =>
                  i.name
                    ? `${i.name} (x${i.qty ?? 1})`
                    : typeof i === "string"
                    ? i
                    : ""
                )
                .join(", ")}
            </p>
          )}

          {o.notes && (
            <p className="order-items">
              <strong>Notes:</strong> {o.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
