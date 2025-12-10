import { useState, useEffect } from "react";
import { createOrder } from "../../api/ordersApi";
import { useNavigate } from "react-router-dom";

export default function WaiterOrderCreate() {
  const [table, setTable] = useState("");
  const [notes, setNotes] = useState("");
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const MENU_API =
    "http://localhost:5001/swift-stack-444307-m4/us-central1/api/menu";

  // ===========================
  // Load menu from backend
  // ===========================
  useEffect(() => {
    fetch(MENU_API)
      .then((res) => res.json())
      .then((data) => setMenu(data))
      .catch(() => setError("Could not load menu"));
  }, []);

  // ===========================
  // Modify item quantity
  // ===========================
  const addToCart = (item) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        ...item,
        qty: (prev[item.id]?.qty || 0) + 1
      }
    }));
  };

  const decreaseQty = (itemId) => {
    setCart((prev) => {
      const qty = prev[itemId]?.qty || 0;
      if (qty <= 1) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      return {
        ...prev,
        [itemId]: { ...prev[itemId], qty: qty - 1 }
      };
    });
  };

  // ===========================
  // Submit Order
  // ===========================
  const handleSubmit = async () => {
    const waiterId = localStorage.getItem("waiterId");
    const waiterName = localStorage.getItem("waiterName");

    if (!waiterId || !waiterName) {
      alert("You must log in as a waiter first.");
      return;
    }

    if (!table || Number(table) <= 0) {
      alert("Please enter a valid table number.");
      return;
    }

    const items = Object.values(cart).map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price
    }));

    if (items.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    const payload = {
      table: Number(table),
      notes: notes.trim(),
      items,
      waiterId,
      waiterName
    };

    console.log("Submitting order payload:", payload);

    try {
      await createOrder(payload);
      navigate("/waiter/home");
    } catch (err) {
      console.error("Create order error:", err);
      const backendError =
        err.response?.data?.error || "Could not create order.";
      alert(backendError);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Create New Order</h1>

      <input
        type="number"
        placeholder="Table number"
        value={table}
        onChange={(e) => setTable(e.target.value)}
        style={{ display: "block", width: 200, marginBottom: 15, padding: 8 }}
      />

      {/* MENU LIST */}
      <h2>Menu</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {menu.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            borderRadius: 6,
            marginBottom: 10
          }}
        >
          <p>
            <strong>{item.name}</strong> – {item.price} AMD
          </p>
          <p>{item.description}</p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => addToCart(item)}
              style={{
                background: "#2ecc71",
                color: "#fff",
                border: "none",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer"
              }}
            >
              +
            </button>

            {cart[item.id]?.qty > 0 && (
              <>
                <span>Qty: {cart[item.id].qty}</span>
                <button
                  onClick={() => decreaseQty(item.id)}
                  style={{
                    background: "#e74c3c",
                    color: "#fff",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: "pointer"
                  }}
                >
                  −
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* NOTES */}
      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ display: "block", width: 300, height: 60, marginTop: 20 }}
      />

      {/* SUBMIT BUTTON */}
      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
          background: "#2ECC71",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          marginTop: 20
        }}
      >
        Send to Kitchen
      </button>
    </div>
  );
}
