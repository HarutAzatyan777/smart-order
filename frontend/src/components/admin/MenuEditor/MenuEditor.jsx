import React, { useState, useEffect } from "react";
import { addMenuItem, getMenuItems } from "../../../services/menu";
import "./MenuEditor.css";

const MenuEditor = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState([]);

  // ✔ Load Menu Function
  const loadMenu = async () => {
    try {
      const data = await getMenuItems();
      setMenu(data);
    } catch (error) {
      console.error("Menu load error:", error);
    }
  };

  // ✔ Correct useEffect async wrapper (no warnings)
  useEffect(() => {
    const fetchMenu = async () => {
      await loadMenu();
    };

    fetchMenu();
  }, []);

  // ✔ Add new menu item
  const handleSubmit = async (e) => {
    e.preventDefault();

    const item = {
      name,
      price: Number(price),
      category,
      description,
      available: true,
    };

    const result = await addMenuItem(item);

    if (result?.id) {
      setMessage(`✔ Added successfully (ID: ${result.id})`);

      // Reset fields
      setName("");
      setPrice("");
      setCategory("");
      setDescription("");

      // Reload menu
      await loadMenu();
    } else {
      setMessage("❌ Failed to add");
    }
  };

  return (
    <div className="menu-editor">
      <h2>Add New Menu Item</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          placeholder="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button type="submit">Add Item</button>
      </form>

      {message && <p className="msg">{message}</p>}

      <hr />

      <h3>Menu Items</h3>
      <div className="menu-list">
        {menu.map((item) => (
          <div key={item.id} className="menu-item">
            <strong>{item.name}</strong> — {item.price} AMD <br />
            <em>{item.category}</em> <br />
            {item.description}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuEditor;
