import { useRef } from "react";

export default function MenuPanel({
  menuSearch,
  setMenuSearch,
  loadingMenu,
  menuName,
  setMenuName,
  menuPrice,
  setMenuPrice,
  menuCategory,
  setMenuCategory,
  menuDescription,
  setMenuDescription,
  addMenuItem,
  categories,
  filteredMenu,
  editingMenuId,
  startEditMenuItem,
  cancelEditMenuItem,
  editMenuName,
  setEditMenuName,
  editMenuPrice,
  setEditMenuPrice,
  editMenuCategory,
  setEditMenuCategory,
  editMenuDescription,
  setEditMenuDescription,
  saveMenuItem,
  toggleMenuAvailability,
  deleteMenuItem,
  menuActionId,
  formatCurrency,
  importingMenu,
  importSummary,
  importMenuFile,
  onReload
}) {
  const fileInputRef = useRef(null);
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await importMenuFile(file);
    e.target.value = "";
  };

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow soft">Menu</p>
          <h2>Menu management</h2>
          <p className="muted">Create, edit, and toggle availability by category.</p>
        </div>
        <div className="panel-actions">
          <input
            className="admin-input compact"
            type="search"
            placeholder="Search menu"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
          />
          <button className="ghost-btn" onClick={onReload} disabled={loadingMenu}>
            {loadingMenu ? "Loading..." : "Reload"}
          </button>
        </div>
      </div>

      <div className="import-box">
        <div className="import-text">
          <p className="eyebrow soft">Bulk import</p>
          <p className="muted small">
            Upload .xlsx, .csv, or .docx with columns: name, price, category, description, available.
          </p>
        </div>
        <div className="import-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.docx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="outline-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importingMenu}
          >
            {importingMenu ? "Importing..." : "Upload file"}
          </button>
        </div>
        {importSummary ? (
          <div className="import-summary">
            <span>Imported: {importSummary.created}</span>
            {importSummary.skipped ? <span>Skipped: {importSummary.skipped}</span> : null}
            {importSummary.failed?.length ? <span>Failed: {importSummary.failed.length}</span> : null}
          </div>
        ) : null}
        {importSummary?.failed?.length ? (
          <div className="import-errors">
            {importSummary.failed.slice(0, 3).map((item, idx) => (
              <p key={`${item.name}-${idx}`}>
                {item.name}: {item.error}
              </p>
            ))}
            {importSummary.failed.length > 3 ? (
              <p className="muted small">+{importSummary.failed.length - 3} more</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="input-grid">
        <div className="field">
          <label>Item name</label>
          <input
            className="admin-input"
            placeholder="Spicy Margherita"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Price (AMD)</label>
          <input
            className="admin-input"
            placeholder="3500"
            type="number"
            value={menuPrice}
            onChange={(e) => setMenuPrice(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Category</label>
          <input
            className="admin-input"
            placeholder="Drinks, Pizza..."
            value={menuCategory}
            onChange={(e) => setMenuCategory(e.target.value)}
          />
        </div>
        <div className="field full">
          <label>Description</label>
          <textarea
            className="admin-textarea"
            rows="2"
            placeholder="Add a short description"
            value={menuDescription}
            onChange={(e) => setMenuDescription(e.target.value)}
          />
        </div>
        <button className="primary-btn" onClick={addMenuItem} disabled={menuActionId === "new"}>
          {menuActionId === "new" ? "Saving..." : "Add menu item"}
        </button>
      </div>

      {loadingMenu ? (
        <div className="skeleton-row">Loading menu...</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">No menu items yet. Add your first dish.</div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="category-block">
            <div className="category-header">
              <h3>{cat}</h3>
              <span className="pill subtle">
                {filteredMenu.filter((m) => (m.category || "Uncategorized") === cat).length} items
              </span>
            </div>
            <div className="menu-grid">
              {filteredMenu
                .filter((m) => (m.category || "Uncategorized") === cat)
                .map((item) => (
                  <div key={item.id} className="admin-menu-card">
                    {editingMenuId === item.id ? (
                      <div className="edit-grid">
                        <input
                          className="admin-input"
                          value={editMenuName}
                          onChange={(e) => setEditMenuName(e.target.value)}
                          placeholder="Item name"
                        />
                        <input
                          className="admin-input"
                          type="number"
                          value={editMenuPrice}
                          onChange={(e) => setEditMenuPrice(e.target.value)}
                          placeholder="Price"
                        />
                        <input
                          className="admin-input"
                          value={editMenuCategory}
                          onChange={(e) => setEditMenuCategory(e.target.value)}
                          placeholder="Category"
                        />
                        <textarea
                          className="admin-textarea"
                          value={editMenuDescription}
                          onChange={(e) => setEditMenuDescription(e.target.value)}
                          placeholder="Description"
                        />
                        <div className="menu-actions">
                          <button
                            className="primary-btn"
                            onClick={saveMenuItem}
                            disabled={menuActionId === item.id}
                          >
                            {menuActionId === item.id ? "Saving..." : "Save"}
                          </button>
                          <button className="ghost-btn" onClick={cancelEditMenuItem}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="menu-card-top">
                          <div>
                            <p className="muted small">{item.category || "Uncategorized"}</p>
                            <h4>{item.name}</h4>
                            <p className="price">{formatCurrency(item.price)}</p>
                          </div>
                          <span
                            className={`status-chip ${item.available === false ? "status-muted" : "status-live"}`}
                          >
                            {item.available === false ? "Unavailable" : "Available"}
                          </span>
                        </div>
                        <p className="muted">{item.description || "No description provided."}</p>
                        <div className="menu-actions">
                          <button className="ghost-btn" onClick={() => startEditMenuItem(item)}>
                            Edit
                          </button>
                          <button
                            className="outline-btn"
                            onClick={() => toggleMenuAvailability(item)}
                            disabled={menuActionId === item.id}
                          >
                            {menuActionId === item.id
                              ? "Updating..."
                              : item.available === false
                              ? "Mark available"
                              : "Mark unavailable"}
                          </button>
                          <button
                            className="danger-btn"
                            onClick={() => deleteMenuItem(item.id)}
                            disabled={menuActionId === item.id}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
