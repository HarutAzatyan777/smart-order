import "./AdminDashboard.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const API =
    "http://localhost:5001/swift-stack-444307-m4/us-central1/api/admin/waiters";

  const [waiters, setWaiters] = useState([]);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // First check: does adminToken exist?
  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin/login");
    }
  }, []);

  // Load waiters list
  const loadWaiters = () => {
    const token = localStorage.getItem("adminToken");

    fetch(API, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          // Token invalid -> logout
          localStorage.removeItem("adminToken");
          navigate("/admin/login");
          return;
        }

        const data = await res.json();
        setWaiters(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot load waiter list");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadWaiters();
  }, []);

  const addWaiter = async () => {
    const token = localStorage.getItem("adminToken");

    if (!name.trim() || !pin.trim()) {
      setError("Name and PIN required");
      return;
    }

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, pin }),
      });

      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }

      setName("");
      setPin("");
      loadWaiters();
    } catch {
      setError("Failed to add waiter");
    }
  };

  const deleteWaiter = async (id) => {
    const token = localStorage.getItem("adminToken");

    if (!window.confirm("Delete this waiter?")) return;

    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        navigate("/admin/login");
        return;
      }

      loadWaiters();
    } catch {
      setError("Failed to delete waiter");
    }
  };

  return (
    <div className="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      <h2 className="section-title">Add Waiter</h2>

      <input
        className="admin-input"
        type="text"
        placeholder="Waiter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        className="admin-input"
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button className="admin-button" onClick={addWaiter}>
        Add Waiter
      </button>

      {error && <p className="error-message">{error}</p>}

      <h2 className="section-title">Waiters List</h2>

      {loading && <p>Loading...</p>}

      {waiters.map((w) => (
        <div key={w.id} className="waiter-card">
          <p><strong>Name:</strong> {w.name}</p>
          <p><strong>PIN:</strong> {w.pin}</p>

          <button className="delete-button" onClick={() => deleteWaiter(w.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
