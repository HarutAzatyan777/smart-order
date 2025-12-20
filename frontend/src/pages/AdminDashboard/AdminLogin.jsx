import "./AdminLogin.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const LOGIN_API = apiUrl("admin/login");

  const handleLogin = async () => {
    try {
      setError("");
      const res = await fetch(LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Invalid login");
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminEmail", data.email || email);

      navigate("/admin");
    } catch (err) {
      setError(err.message || "Invalid login");
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <p className="eyebrow">Admin console</p>
        <h1>Sign in</h1>
        <p className="muted">Use the admin email and PIN provided for your environment.</p>

        <div className="field">
          <label>Email</label>
          <input
            type="text"
            placeholder="admin@smartorder.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>PIN</label>
          <input
            type="password"
            placeholder="Admin PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>

        <button className="primary-btn" onClick={handleLogin}>
          Login
        </button>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </div>
  );
}
