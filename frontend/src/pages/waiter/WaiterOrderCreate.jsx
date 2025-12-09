import { useState } from "react";
import { createOrder } from "../../api/ordersApi";
import { useNavigate } from "react-router-dom";

export default function WaiterOrderCreate() {
  const [table, setTable] = useState("");
  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async () => {
    const waiterId = localStorage.getItem("waiterId");
    const waiterName = localStorage.getItem("waiterName");

    // If waiter is not logged in
    if (!waiterId || !waiterName) {
      alert("You must log in as a waiter first.");
      return;
    }

    // Clean items text
    const cleanedItems = items
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    // Validation
    if (!table || Number(table) <= 0) {
      alert("Please enter a valid table number.");
      return;
    }

    if (cleanedItems.length === 0) {
      alert("Please enter at least one item.");
      return;
    }

    const payload = {
      table: Number(table),
      items: cleanedItems,
      notes: notes.trim(),
      waiterId,            // attach the logged-in waiter
      waiterName,
    };

    console.log("Submitting order payload:", payload);

    try {
      await createOrder(payload);
      navigate("/waiter/home");
    } catch (err) {
      console.error("Create order error:", err);
      const backendError =
        err.response?.data?.error || "Could not create order. Check console.";
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

      <textarea
        placeholder="Items: coke, burger"
        value={items}
        onChange={(e) => setItems(e.target.value)}
        style={{ display: "block", width: 300, height: 100, marginBottom: 15 }}
      />

      <textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ display: "block", width: 300, height: 60, marginBottom: 20 }}
      />

      <button
        onClick={handleSubmit}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
          background: "#2ECC71",
          color: "#fff",
          border: "none",
          borderRadius: 6
        }}
      >
        Send to Kitchen
      </button>
    </div>
  );
}
