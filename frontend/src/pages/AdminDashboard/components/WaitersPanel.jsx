export default function WaitersPanel({
  waiters,
  loading,
  waiterAction,
  name,
  pin,
  onNameChange,
  onPinChange,
  onAdd,
  onDelete,
  onReload
}) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow soft">Team</p>
          <h2>Waiters</h2>
          <p className="muted">Add new staff or remove logins instantly.</p>
        </div>
        <div className="panel-actions">
          <button className="ghost-btn" onClick={onReload} disabled={loading}>
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>
      </div>

      <div className="input-grid">
        <div className="field">
          <label>Waiter name</label>
          <input
            className="admin-input"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label>PIN</label>
          <input
            className="admin-input"
            placeholder="4+ digits"
            type="password"
            value={pin}
            onChange={(e) => onPinChange(e.target.value)}
          />
        </div>
        <button className="primary-btn" onClick={onAdd} disabled={waiterAction}>
          {waiterAction ? "Saving..." : "Add waiter"}
        </button>
      </div>

      <div className="list-grid">
        {loading ? (
          <div className="skeleton-row">Loading waiters...</div>
        ) : waiters.length === 0 ? (
          <div className="empty-state">No waiters yet. Add your team to start.</div>
        ) : (
          waiters.map((w) => (
            <div key={w.id} className="waiter-card">
              <div>
                <p className="waiter-name">{w.name}</p>
                <p className="muted small">PIN: {w.pin}</p>
              </div>
              <button className="danger-btn" onClick={() => onDelete(w.id)} disabled={waiterAction}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
