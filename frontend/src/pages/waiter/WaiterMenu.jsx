import { useState } from "react";
import useMenu from "../../hooks/useMenu";

export default function WaiterMenu() {
  const { menu, loading } = useMenu();
  const [cart, setCart] = useState([]);

  if (loading) return <p>Loading menu...</p>;

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.id === item.id);
      if (exists) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const decreaseQty = (id) => {
    setCart((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0)
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Menu</h1>

      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT: menu */}
        <div style={{ flex: 2 }}>
          {menu.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #ccc",
                padding: 12,
                marginBottom: 10,
                borderRadius: 8,
              }}
            >
              <h3>{item.name}</h3>
              <p>{item.price} AMD</p>

              <button onClick={() => addToCart(item)}>Add</button>
            </div>
          ))}
        </div>

        {/* RIGHT: cart */}
        <div style={{ flex: 1, background: "#f9f9f9", padding: 12, borderRadius: 10 }}>
          <h2>Order</h2>

          {cart.length === 0 && <p>No items selected.</p>}

          {cart.map((c) => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <strong>{c.name}</strong> ({c.qty})
              <br />
              <button onClick={() => decreaseQty(c.id)}>-</button>
              <button onClick={() => addToCart(c)}>+</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
