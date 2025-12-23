import React from "react";

export default function TablesPanel({
  tables,
  loading,
  error,
  formNumber,
  setFormNumber,
  formLabel,
  setFormLabel,
  onCreate,
  onToggleActive,
  onDelete,
  onReload
}) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow soft">Tables</p>
          <h2>Table management</h2>
          <p className="muted">Create, enable/disable, and remove tables.</p>
        </div>
        <button className="ghost-btn" onClick={onReload} disabled={loading}>
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>
      {error ? <div className="admin-alert">{error}</div> : null}
      <div className="input-grid">
        <div className="field">
          <label>Table number</label>
          <input
            className="admin-input"
            type="number"
            min="1"
            value={formNumber}
            onChange={(e) => setFormNumber(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="field">
          <label>Label</label>
          <input
            className="admin-input"
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="Table 1"
          />
        </div>
        <button
          className="primary-btn"
          type="button"
          onClick={onCreate}
          disabled={loading}
        >
          Add table
        </button>
      </div>

      {loading ? (
        <div className="skeleton-row">Loading tables...</div>
      ) : tables.length === 0 ? (
        <div className="empty-state">No tables yet. Add your first table.</div>
      ) : (
        <div className="list-grid">
          {tables.map((table) => (
            <div key={table.id} className="waiter-card">
              <div>
                <p className="waiter-name">
                  {table.label || `Table ${table.number}`} (#{table.number})
                </p>
                <p className="muted small">Status: {table.active === false ? "Inactive" : "Active"}</p>
              </div>
              <div className="panel-actions">
                <button
                  className="ghost-btn small"
                  onClick={() => onToggleActive(table)}
                  disabled={loading}
                >
                  {table.active === false ? "Activate" : "Deactivate"}
                </button>
                <button
                  className="danger-btn small"
                  onClick={() => onDelete(table)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
