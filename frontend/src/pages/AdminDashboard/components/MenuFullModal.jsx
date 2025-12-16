export default function MenuFullModal({ open, onClose, categories, filteredMenu }) {
  if (!open) return null;

  const itemsForCategory = (cat) =>
    filteredMenu.filter((m) => (m.category || "Uncategorized") === cat);

  return (
    <div className="menu-full-modal">
      <div className="menu-full-backdrop" onClick={onClose} />
      <div className="menu-full-content" role="dialog" aria-modal="true">
        <header className="menu-full-header">
          <h3>Full menu viewer</h3>
          <p className="muted small">Browse every category without scrolling the dashboard.</p>
        </header>
        <div className="menu-full-body">
          {categories.length === 0 ? (
            <p>No menu items available yet.</p>
          ) : (
            categories.map((cat) => {
              const items = itemsForCategory(cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="menu-full-category">
                  <div className="menu-full-category-header">
                    <h4>{cat}</h4>
                    <span className="pill subtle">{items.length} items</span>
                  </div>
                  <div className="menu-full-items">
                    {items.map((item) => (
                      <div key={item.id || item.name} className="menu-full-item">
                        <div>
                          <p className="title">{item.name}</p>
                          <p className="muted small">{item.description || "No description provided."}</p>
                        </div>
                        <span className="price">{item.price ? `${item.price} AMD` : "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="menu-full-actions">
          <button className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
