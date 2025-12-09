import { useState, useEffect } from "react";

export default function WaiterLogin() {
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);

  const API =
    "http://localhost:5001/swift-stack-444307-m4/us-central1/api/waiters";

  // Load waiters
  useEffect(() => {
    fetch(API)
      .then((res) => res.json())
      .then((data) => {
        // Only active waiters
        const active = data.filter((w) => w.active !== false);
        setWaiters(active);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load waiters list");
        setLoading(false);
      });
  }, []);

  const handleLogin = () => {
    setError("");

    if (!selectedWaiterId) {
      setError("Please select your name");
      return;
    }

    const waiter = waiters.find((w) => w.id === selectedWaiterId);

    if (!waiter) {
      setError("Waiter not found");
      return;
    }

    if (waiter.pin !== pin.trim()) {
      setError("Incorrect PIN");
      return;
    }

    // Save waiter details
    localStorage.setItem("waiterId", waiter.id);
    localStorage.setItem("waiterName", waiter.name);

    window.location.href = "/waiter/home";
  };

  return (
    <div style={{ padding: 20, maxWidth: 300, margin: "0 auto" }}>
      <h1>Waiter Login</h1>

      {loading && <p>Loading waiters...</p>}

      {/* Waiter selector */}
      <select
        value={selectedWaiterId}
        onChange={(e) => {
          setSelectedWaiterId(e.target.value);
          setError("");
        }}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 12,
          fontSize: 16,
        }}
      >
        <option value="">Select your name</option>

        {waiters.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      {/* PIN input */}
      <input
        type="password"
        placeholder="Enter PIN"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError("");
        }}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 12,
          fontSize: 16,
        }}
      />

      <button
        onClick={handleLogin}
        style={{
          width: "100%",
          padding: "10px 16px",
          background: "#74c69d",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Login
      </button>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
