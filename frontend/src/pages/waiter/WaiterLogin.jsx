import { useState, useEffect, useMemo, useCallback } from "react";
import { apiUrl } from "../../config/api";
import "./WaiterLogin.css";

export default function WaiterLogin() {
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);

  const API = apiUrl("waiters");

  const loadWaiters = useCallback(() => {
    setLoading(true);
    setError("");

    fetch(API)
      .then((res) => res.json())
      .then((data) => {
        const active = Array.isArray(data)
          ? data.filter((w) => w.active !== false)
          : [];
        setWaiters(active);
      })
      .catch(() => {
        setError("Could not load waiters list");
        setWaiters([]);
      })
      .finally(() => setLoading(false));
  }, [API]);

  // Load waiters
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWaiters();
  }, [loadWaiters]);

  const selectedWaiter = useMemo(
    () => waiters.find((w) => w.id === selectedWaiterId),
    [waiters, selectedWaiterId]
  );

  const handleLogin = () => {
    setError("");

    if (!selectedWaiterId) {
      setError("Please select your name.");
      return;
    }

    if (!selectedWaiter) {
      setError("Waiter not found.");
      return;
    }

    if (selectedWaiter.pin !== pin.trim()) {
      setError("Incorrect PIN. Please try again.");
      return;
    }

    localStorage.setItem("waiterId", selectedWaiter.id);
    localStorage.setItem("waiterName", selectedWaiter.name);

    window.location.href = "/waiter/home";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="waiter-login-page">
      <div className="waiter-login-card">
        <div className="login-head">
          <p className="eyebrow">Waiter console</p>
          <h1>Sign in to shift</h1>
          <p className="muted">
            Choose your name and enter your PIN to access tables and live orders.
          </p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {loading ? (
          <div className="skeleton">Loading waiters...</div>
        ) : (
          <>
            <label className="field">
              <span>Name</span>
              <select
                className="input"
                value={selectedWaiterId}
                onChange={(e) => {
                  setSelectedWaiterId(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
              >
                <option value="">Select your name</option>
                {waiters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>PIN</span>
              <input
                className="input"
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
              />
            </label>

            <button className="primary-btn" onClick={handleLogin}>
              Login
            </button>

            <p className="muted helper">
              Keep your PIN private. Ask a manager to reset access if you cannot sign in.
            </p>
          </>
        )}

        {!loading && !waiters.length ? (
          <div className="alert warning">
            No active waiters found. Refresh or contact an admin.
            <button className="link-btn" onClick={loadWaiters}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
