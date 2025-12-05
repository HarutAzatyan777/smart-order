import React, { useState } from "react";
import { addMenuItem } from "../../../services/menu";
import "./MenuEditor.css";

const MenuEditor = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

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
      setName("");
      setPrice("");
      setCategory("");
      setDescription("");
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
    </div>
  );
};

export default MenuEditor;
