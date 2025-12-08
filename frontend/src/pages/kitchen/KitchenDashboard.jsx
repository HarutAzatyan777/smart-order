import useOrdersRealtime from "../../hooks/useOrdersRealtime";
import { updateOrderStatus } from "../../api/ordersApi";

export default function KitchenDashboard() {
  const orders = useOrdersRealtime();

  const update = async (id, status) => {
    await updateOrderStatus(id, status);
  };

  return (
    <div>
      <h1>Kitchen Dashboard</h1>

      {orders
        .filter((o) => o.status === "new")
        .map((o) => (
          <div key={o.id}>
            <p>Table {o.table}</p>
            <button onClick={() => update(o.id, "cooking")}>Start Cooking</button>
          </div>
        ))}
    </div>
  );
}
