import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useTables from "../../hooks/useTables";
import { setAnalyticsContext, trackEvent } from "../../utils/analytics";
import "./WaiterSelectTable.css";

export default function WaiterSelectTable() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tables, loading, error, refresh } = useTables();

  const waiterName = localStorage.getItem("waiterName") || "Waiter";
  const waiterId = localStorage.getItem("waiterId");
  const [search, setSearch] = useState("");
  const [localError, setLocalError] = useState("");

  const filteredTables = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tables;
    return tables.filter(
      (t) =>
        String(t.number || "").toLowerCase().includes(term) ||
        String(t.label || "").toLowerCase().includes(term)
    );
  }, [tables, search]);

  useEffect(() => {
    if (!waiterId || !waiterName) {
      navigate("/waiter", { replace: true });
    }
  }, [navigate, waiterId, waiterName]);

  useEffect(() => {
    setAnalyticsContext({ userRole: "waiter" });
  }, []);

  useEffect(() => {
    if (location.state?.error) {
      sessionStorage.removeItem("selectedTableId");
      localStorage.removeItem("selectedTableId");
      setLocalError(location.state.error);
      navigate("/waiter/select-table", { replace: true });
    }
  }, [location.state, navigate]);

  const handleSelect = (table) => {
    if (!table?.id) return;
    if (table.active === false || table.available === false) {
      setLocalError("Selected table is unavailable. Please choose another table.");
      return;
    }
    setAnalyticsContext({ userRole: "waiter", tableNumber: table.number || null });
    trackEvent("order_started", {
      table_number: table.number,
      location: table.label || undefined,
      waiter_id: waiterId || undefined,
      waiter_name: waiterName
    });
    sessionStorage.setItem("selectedTableId", table.id);
    localStorage.setItem("selectedTableId", table.id);
    navigate("/waiter/create", { state: { tableId: table.id } });
  };

  return (
    <div className="waiter-select-page">
      <header className="order-header">
        <div>
          <p className="eyebrow">Waiter console</p>
          <h1 className="page-title">Select a table</h1>
          <p className="muted">
            Choose a table first, then build the order. This keeps large orders easy to send.
          </p>
        </div>

        <div className="header-actions">
          <Link to="/waiter/home" className="ghost-btn">
            Waiter Home
          </Link>
          <div className="waiter-chip">
            <span className="pill-label">Waiter</span>
            <span>{waiterName}</span>
          </div>
        </div>
      </header>

      {location.state?.error ? (
        <div className="alert error">
          <span>{location.state.error}</span>
          <button className="link-btn" onClick={() => navigate("/waiter/select-table", { replace: true })}>
            Dismiss
          </button>
        </div>
      ) : null}

      {(error || localError) ? (
        <div className="alert error">
          <span>{localError || error}</span>
          {error ? (
            <button className="link-btn" onClick={refresh}>
              Retry
            </button>
          ) : (
            <button
              className="link-btn"
              onClick={() => {
                setLocalError("");
                navigate("/waiter/select-table", { replace: true });
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      ) : null}

      <div className="table-toolbar">
        <div className="search-box">
          <input
            type="search"
            placeholder="Search tables by number or label"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button className="link-btn" onClick={() => setSearch("")}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="toolbar-actions">
          <button className="ghost-btn" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Reload"}
          </button>
          <Link to="/waiter/home" className="ghost-btn">
            Back to orders
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="panel empty-panel">
          <p className="empty-title">Loading tables...</p>
          <p className="muted small">Fetching tables.</p>
        </div>
      ) : tables.length === 0 ? (
        <div className="panel empty-panel">
          <p className="empty-title">No active tables</p>
          <p className="muted small">Ask an admin to add tables before creating orders.</p>
          <button className="ghost-btn" onClick={refresh}>
            Reload
          </button>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="panel empty-panel">
          <p className="empty-title">No tables match your search.</p>
          <button className="ghost-btn" onClick={() => setSearch("")}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="table-grid">
          {filteredTables.map((table) => (
            <button
              key={table.id}
              className={`table-card${table.active === false || table.available === false ? " is-disabled" : ""}`}
              type="button"
              onClick={() => handleSelect(table)}
              disabled={table.active === false || table.available === false}
            >
              <div className="table-number">#{table.number}</div>
              {table.label && table.label !== String(table.number) ? (
                <div className="table-label">{table.label}</div>
              ) : (
                <div className="table-label muted">Table {table.number}</div>
              )}
              <div className="table-status">
                {table.active === false || table.available === false
                  ? "Unavailable"
                  : "Tap to start order"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
