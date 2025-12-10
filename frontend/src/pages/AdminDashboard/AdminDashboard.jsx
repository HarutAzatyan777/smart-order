import "./AdminDashboard.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const WAITER_API =
    "http://localhost:5001/swift-stack-444307-m4/us-central1/api/admin/waiters";

  const ORDERS_API =
    "http://localhost:5001/swift-stack-444307-m4/us-central1/api/admin/orders";

  const MENU_API =
    "http://localhost:5001/swift-stack-444307-m4/us-central1/api/admin/menu";

  const [waiters, setWaiters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  // menu fields
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");

  // edit menu fields
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPrice, setEditMenuPrice] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");

  const [error, setError] = useState("");

  // Check admin token
  useEffect(() => {
    if (!localStorage.getItem("adminToken")) {
      navigate("/admin/login");
    }
  }, []);

  const token = localStorage.getItem("adminToken");

  // ========================= LOADERS ========================= //

  const loadWaiters = () => {
    fetch(WAITER_API, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setWaiters)
      .catch(() => setError("Cannot load waiter list"));
  };

  const loadOrders = () => {
    fetch(ORDERS_API, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => setError("Cannot load orders"));
  };

  const loadMenu = () => {
    fetch(MENU_API, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setMenu)
      .catch(() => setError("Cannot load menu"));
  };

  useEffect(() => {
    loadWaiters();
    loadOrders();
    loadMenu();
  }, []);

  // ========================= ADD WAITER ========================= //

  const addWaiter = async () => {
    if (!name.trim() || !pin.trim()) {
      setError("Name and PIN required");
      return;
    }

    setError("");

    await fetch(WAITER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, pin }),
    });

    setName("");
    setPin("");
    loadWaiters();
  };

  const deleteWaiter = async (id) => {
    if (!window.confirm("Delete waiter?")) return;

    await fetch(`${WAITER_API}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    loadWaiters();
  };

  // ========================= MENU CRUD ========================= //

  const addMenuItem = async () => {
    if (!menuName.trim() || !menuPrice || !menuCategory.trim()) {
      setError("Menu name, price, and category required");
      return;
    }

    setError("");

    const payload = {
      name: menuName,
      price: Number(menuPrice),
      category: menuCategory,
      description: menuDescription,
      available: true,
    };

    await fetch(MENU_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    setMenuName("");
    setMenuPrice("");
    setMenuCategory("");
    setMenuDescription("");

    loadMenu();
  };

  const startEditMenuItem = (item) => {
    setEditingMenuId(item.id);
    setEditMenuName(item.name);
    setEditMenuPrice(item.price);
    setEditMenuCategory(item.category);
    setEditMenuDescription(item.description || "");
  };

  const cancelEditMenuItem = () => {
    setEditingMenuId(null);
    setEditMenuName("");
    setEditMenuPrice("");
    setEditMenuCategory("");
    setEditMenuDescription("");
  };

  const saveMenuItem = async () => {
    if (!editingMenuId) return;

    if (!editMenuName.trim() || !editMenuPrice || !editMenuCategory.trim()) {
      setError("Menu name, price, and category required");
      return;
    }

    const payload = {
      name: editMenuName,
      price: Number(editMenuPrice),
      category: editMenuCategory,
      description: editMenuDescription,
    };

    await fetch(`${MENU_API}/${editingMenuId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    setError("");

    cancelEditMenuItem();
    loadMenu();
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete menu item?")) return;

    await fetch(`${MENU_API}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    loadMenu();
  };

  // group menu by categories
  const categories = [...new Set(menu.map((m) => m.category))];

  return (
    <div className="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      {/* ==================== WAITER CREATE ==================== */}
      <h2 className="section-title">Add Waiter</h2>

      <input
        className="admin-input"
        placeholder="Waiter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="admin-input"
        placeholder="PIN"
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button className="admin-button" onClick={addWaiter}>
        Add Waiter
      </button>

      {/* ==================== WAITER LIST ==================== */}
      <h2 className="section-title">Waiters</h2>

      {waiters.map((w) => (
        <div key={w.id} className="waiter-card">
          <p>{w.name}</p>
          <p>PIN: {w.pin}</p>
          <button className="delete-button" onClick={() => deleteWaiter(w.id)}>
            Delete
          </button>
        </div>
      ))}

      {/* ==================== MENU SECTION ==================== */}
      <h2 className="section-title">Menu Management</h2>

      <input
        className="admin-input"
        placeholder="Item Name"
        value={menuName}
        onChange={(e) => setMenuName(e.target.value)}
      />

      <input
        className="admin-input"
        placeholder="Price"
        type="number"
        value={menuPrice}
        onChange={(e) => setMenuPrice(e.target.value)}
      />

      <input
        className="admin-input"
        placeholder="Category (Drinks, Pizza, Burger...)"
        value={menuCategory}
        onChange={(e) => setMenuCategory(e.target.value)}
      />

      <textarea
        className="admin-input"
        placeholder="Description"
        value={menuDescription}
        onChange={(e) => setMenuDescription(e.target.value)}
      />

      <button className="admin-button" onClick={addMenuItem}>
        Add Menu Item
      </button>

      {/* ==================== SHOW MENU ==================== */}
      <h2 className="section-title">Current Menu</h2>

      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="category-title">{cat}</h3>

          {menu
            .filter((m) => m.category === cat)
            .map((item) => (
              <div key={item.id} className="menu-card">
                {editingMenuId === item.id ? (
                  <>
                    <input
                      className="admin-input"
                      value={editMenuName}
                      onChange={(e) => setEditMenuName(e.target.value)}
                      placeholder="Item Name"
                    />
                    <input
                      className="admin-input"
                      type="number"
                      value={editMenuPrice}
                      onChange={(e) => setEditMenuPrice(e.target.value)}
                      placeholder="Price"
                    />
                    <input
                      className="admin-input"
                      value={editMenuCategory}
                      onChange={(e) => setEditMenuCategory(e.target.value)}
                      placeholder="Category"
                    />
                    <textarea
                      className="admin-input"
                      value={editMenuDescription}
                      onChange={(e) => setEditMenuDescription(e.target.value)}
                      placeholder="Description"
                    />
                    <div className="menu-actions">
                      <button className="save-button" onClick={saveMenuItem}>
                        Save
                      </button>
                      <button className="cancel-button" onClick={cancelEditMenuItem}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>{item.name}</strong> ({item.price} AMD)
                    </p>
                    <p>{item.description}</p>
                    <div className="menu-actions">
                      <button
                        className="edit-button"
                        onClick={() => startEditMenuItem(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => deleteMenuItem(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      ))}

      {/* ==================== ORDERS SECTION ==================== */}
      <h2 className="section-title">Orders</h2>

      {orders.map((o) => (
        <div key={o.id} className="order-card-admin">
          <p><strong>Table:</strong> {o.table}</p>
          <p><strong>Waiter:</strong> {o.waiterName}</p>
          <p><strong>Status:</strong> {o.status}</p>
        </div>
      ))}
    </div>
  );
}
