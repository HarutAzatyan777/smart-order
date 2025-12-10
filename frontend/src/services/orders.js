import { apiUrl } from "../config/api";

const ORDERS_API = apiUrl("orders");

export const createOrder = async (order) => {
  const res = await fetch(ORDERS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create order");
  }

  return res.json();
};

export const getOrders = async () => {
  const res = await fetch(ORDERS_API);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load orders");
  }

  return res.json();
};

export const updateOrderStatus = async (orderId, status) => {
  const res = await fetch(apiUrl(`orders/${orderId}/status`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update status");
  }

  return res.json();
};
