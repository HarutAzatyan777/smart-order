export default function OrdersPanel({
  filteredOrders,
  loadingOrders,
  orderFilter,
  setOrderFilter,
  orderSearch,
  setOrderSearch,
  updateOrderStatus,
  orderActionId,
  getAdminOrderActions,
  getAgeLabel,
  getItemCount,
  formatStatus,
  isLagging,
  onReload
}) {
  return (
    <section className="admin-panel wide">
      <div className="panel-heading">
        <div>
          <p className="eyebrow soft">Orders</p>
          <h2>Order review</h2>
          <p className="muted">Search, filter, and intervene when needed.</p>
        </div>
        <div className="panel-actions">
          <div className="filter-group">
            {["active", "ready", "all"].map((key) => (
              <button
                key={key}
                className={`pill-btn ${orderFilter === key ? "active" : ""}`}
                onClick={() => setOrderFilter(key)}
              >
                {key === "active" ? "Active" : key === "ready" ? "Ready" : "All"}
              </button>
            ))}
          </div>
          <input
            className="admin-input compact"
            type="search"
            placeholder="Search by table, waiter, status, or item"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
          />
          <button className="ghost-btn" onClick={onReload} disabled={loadingOrders}>
            {loadingOrders ? "Loading..." : "Reload"}
          </button>
        </div>
      </div>

      {loadingOrders ? (
        <div className="skeleton-row">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">No orders match your filters right now.</div>
      ) : (
        <div className="orders-grid">
          {filteredOrders.map((o) => {
            const age = getAgeLabel(o.createdAt);
            const actions = getAdminOrderActions(o.status);
            return (
              <article key={o.id} className={`admin-order-card${isLagging(o) ? " overdue" : ""}`}>
                <div className="order-card-header">
                  <div>
                    <p className="muted small">Table</p>
                    <p className="order-table">{o.table || "-"}</p>
                    <div className="meta-row">
                      {o.waiterName ? <span className="pill subtle">Waiter: {o.waiterName}</span> : null}
                      <span className="pill light">{getItemCount(o.items)} items</span>
                      {age ? <span className="age-chip">{age}</span> : null}
                    </div>
                  </div>
                  <span className={`status-chip status-${o.status || "new"}`}>
                    {formatStatus(o.status)}
                  </span>
                </div>

                {Array.isArray(o.items) && o.items.length ? (
                  <div className="order-items">
                    <p className="order-label">Items</p>
                    <ul>
                      {o.items.map((item, idx) => (
                        <li key={idx}>
                          <span>{item?.name || item}</span>
                          {item?.qty ? <span className="item-qty">x{item.qty}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="muted small">No items captured.</p>
                )}

                {o.notes ? (
                  <div className="note-box">
                    <p className="order-label">Notes</p>
                    <p>{o.notes}</p>
                  </div>
                ) : null}

                <div className="order-actions">
                  {actions.length === 0 ? (
                    <span className="pill subtle">No admin actions</span>
                  ) : (
                    actions.map((action) => (
                      <button
                        key={action.status}
                        className={action.tone || "outline-btn"}
                        disabled={orderActionId === o.id}
                        onClick={() => updateOrderStatus(o.id, action.status)}
                      >
                        {orderActionId === o.id ? "Updating..." : action.label}
                      </button>
                    ))
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
