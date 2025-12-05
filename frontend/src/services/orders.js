const BASE_URL = "https://us-central1-swift-stack-444307-m4.cloudfunctions.net";

export const createOrder = async (order) => {
  const res = await fetch(`${BASE_URL}/createOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  });
  return res.json();
};

export const getOrders = async () => {
  const res = await fetch(`${BASE_URL}/getOrders`);
  return res.json();
};

export const updateOrderStatus = async (orderId, status) => {
  const res = await fetch(`${BASE_URL}/updateOrderStatus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, status })
  });
  return res.json();
};
