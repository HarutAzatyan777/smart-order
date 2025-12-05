import { useState, useEffect } from "react";
import { getOrders, createOrder, updateOrderStatus } from "../services/orders";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [newOrderText, setNewOrderText] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const data = await getOrders();
    setOrders(data);
  };

  const handleCreate = async () => {
    if (!newOrderText) return;
    await createOrder({ items: [{ name: newOrderText, quantity: 1 }] });
    setNewOrderText("");
    fetchOrders();
  };

  const handleStatusChange = async (orderId, status) => {
    await updateOrderStatus(orderId, status);
    fetchOrders();
  };

  return (
    <div>
      <h1>Orders</h1>
      <input
        type="text"
        value={newOrderText}
        onChange={(e) => setNewOrderText(e.target.value)}
        placeholder="New order item"
      />
      <button onClick={handleCreate}>Create Order</button>

      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            {order.items.map(i => i.name).join(", ")} - {order.status}
            <button onClick={() => handleStatusChange(order.id, "done")}>Done</button>
            <button onClick={() => handleStatusChange(order.id, "canceled")}>Cancel</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
