import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (email === "admin@smartorder.com" && pin === "Admin.1234") {
      // SAVE ADMIN TOKEN
      localStorage.setItem("adminToken", "secure_admin_token_123");
      navigate("/admin");
    } else {
      setError("Invalid login");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Login</h1>

      <input
        type="text"
        placeholder="Admin Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
