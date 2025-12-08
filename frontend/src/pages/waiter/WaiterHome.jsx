import useOrdersRealtime from "../../hooks/useOrdersRealtime";

export default function WaiterHome() {
  const orders = useOrdersRealtime();

  return (
    <div>
      <h2>Your Orders</h2>

      <a href="/waiter/create">Create New Order</a>

      {orders.map((o) => (
        <div key={o.id}>
          <p>Table: {o.table}</p>
          <p>Status: {o.status}</p>
        </div>
      ))}
    </div>
  );
}
