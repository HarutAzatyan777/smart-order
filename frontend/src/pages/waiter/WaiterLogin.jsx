import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "../../config/api";
import "./WaiterLogin.css";

export default function WaiterLogin() {
  const [selectedWaiterId, setSelectedWaiterId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const WAITERS_API = apiUrl("waiter/waiters");
  const LOGIN_API = apiUrl("waiter/login");

  const loadWaiters = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(WAITERS_API);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const active = Array.isArray(data) ? data.filter((w) => w.active !== false) : [];
      setWaiters(active);
    } catch (err) {
      console.error("Waiter load error:", err);
      setError("Could not load waiters list");
      setWaiters([]);
    } finally {
      setLoading(false);
    }
  }, [WAITERS_API]);

  // Load waiters
  useEffect(() => {
    loadWaiters();
  }, [loadWaiters]);

  // Auto-continue session if waiter is still active
  useEffect(() => {
    const forceLogin = sessionStorage.getItem("waiterForceLogin");
    if (forceLogin) {
      sessionStorage.removeItem("waiterForceLogin");
      setSelectedWaiterId("");
      setPin("");
      setRedirecting(false);
      return;
    }

    const storedWaiterId = localStorage.getItem("waiterId");
    const storedWaiterName = localStorage.getItem("waiterName");
    if (!storedWaiterId || !storedWaiterName) return;

    const stillActive = waiters.some((w) => w.id === storedWaiterId);
    if (stillActive) {
      setRedirecting(true);
      window.location.href = "/waiter/home";
    } else if (!loading) {
      localStorage.removeItem("waiterId");
      localStorage.removeItem("waiterName");
    }
  }, [waiters, loading]);

  const handleLogin = async () => {
    setError("");

    if (!selectedWaiterId) {
      setError("Please select your name.");
      return;
    }

    if (!pin.trim()) {
      setError("Please enter your PIN.");
      return;
    }

    try {
      const res = await fetch(LOGIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waiterId: selectedWaiterId, pin })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Invalid login");
      }

      const fallbackName =
        waiters.find((w) => w.id === selectedWaiterId)?.name || "Waiter";
      const waiterName = data?.name || fallbackName;

      localStorage.setItem("waiterId", data?.id || selectedWaiterId);
      localStorage.setItem("waiterName", waiterName);

      window.location.href = "/waiter/home";
    } catch (err) {
      console.error("Waiter login error:", err);
      setError(err.message || "Invalid login");
    }
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
                disabled={redirecting}
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
                disabled={redirecting}
              />
            </label>

            <button className="primary-btn" onClick={handleLogin} disabled={redirecting}>
              {redirecting ? "Redirecting..." : "Login"}
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
