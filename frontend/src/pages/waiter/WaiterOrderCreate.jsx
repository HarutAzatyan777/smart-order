import { useState } from "react";
import { createOrder } from "../../api/ordersApi";

export default function WaiterOrderCreate() {
  const [table, setTable] = useState("");
  const [items, setItems] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    const cleanedItems = items
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    const payload = {
      table: Number(table),            // store as number
      waiterName: "Waiter",            // backend default, but we send explicitly
      items: cleanedItems,             // clean list
      notes: notes.trim()              // avoid trailing spaces
    };

    console.log("Submitting order payload:", payload);

    try {
      await createOrder(payload);
      window.location.href = "/waiter/home";
    } catch (err) {
      console.error("Create order error:", err);
      alert("Could not create order. Check console.");
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
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Send to Kitchen
      </button>
    </div>
  );
}
