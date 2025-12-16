  import { forwardRef, useRef, useState } from "react";

const MenuPanel = forwardRef(function MenuPanel({
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
  imageUploadStatus,
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
  onReload,
  menuImagePreview,
  onMenuImageFileChange,
  onMenuImageClear,
  editMenuImagePreview,
  editMenuImageUrl,
  onEditMenuImageFileChange,
  onEditMenuImageClearSelection,
  onEditMenuImageRemove,
  maxCategoryList = Infinity,
  onViewAllClick,
  menuFilter,
  setMenuFilter
}, ref) {
  const visibleCategories =
    maxCategoryList === Infinity ? categories : categories.slice(0, maxCategoryList);
  const fileInputRef = useRef(null);
  const menuImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  const [openCategories, setOpenCategories] = useState({});
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await importMenuFile(file);
    e.target.value = "";
  };

  const hasCat = (cat) => Object.prototype.hasOwnProperty.call(openCategories, cat);

  const isCategoryOpen = (cat, idx) => (hasCat(cat) ? openCategories[cat] : idx < 2);

  const toggleCategory = (cat, idx) => {
    setOpenCategories((prev) => {
      const currentlyOpen = hasCat(cat) ? prev[cat] : idx < 2;
      return { ...prev, [cat]: !currentlyOpen };
    });
  };

  return (
    <section className="admin-panel" ref={ref}>
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
          <select
            className="admin-input compact"
            value={menuFilter}
            onChange={(e) => setMenuFilter(e.target.value)}
          >
            <option value="all">All items</option>
            <option value="available">Available only</option>
            <option value="unavailable">Unavailable only</option>
          </select>
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
        <div className="field full image-field">
          <label>Item photo (optional)</label>
          <div className="image-upload-panel">
            <button
              type="button"
              className="outline-btn"
              onClick={() => menuImageInputRef.current?.click()}
            >
              {menuImagePreview ? "Update photo" : "Upload photo"}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={onMenuImageClear}
              disabled={!menuImagePreview}
            >
              Remove
            </button>
            <input
              ref={menuImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => onMenuImageFileChange?.(e.target.files?.[0])}
            />
          </div>
          {menuImagePreview ? (
            <div className="image-upload-preview">
              <img src={menuImagePreview} alt="Preview" />
              <span className="muted small">Preview of the uploaded photo.</span>
            </div>
          ) : (
            <p className="muted small">Add an optional photo to make the item pop.</p>
          )}
        </div>
        <button
          className="primary-btn"
          onClick={addMenuItem}
          disabled={menuActionId === "new" || imageUploadStatus?.create}
        >
          {imageUploadStatus?.create
            ? "Uploading photo..."
            : menuActionId === "new"
            ? "Saving..."
            : "Add menu item"}
        </button>
      </div>

      {loadingMenu ? (
        <div className="skeleton-row">Loading menu...</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">No menu items yet. Add your first dish.</div>
      ) : (
        visibleCategories.map((cat, idx) => {
          const itemsForCategory = filteredMenu.filter(
            (m) => (m.category || "Uncategorized") === cat
          );
          if (!itemsForCategory.length) return null;
          const categoryOpen = isCategoryOpen(cat, idx);
          return (
            <div key={cat} className="category-block" data-open={categoryOpen ? "true" : "false"}>
              <div className="category-header">
                <h3>{cat}</h3>
                <div className="category-header-meta">
                  <span className="pill subtle">{itemsForCategory.length} items</span>
                  <button
                    className="ghost-btn small category-toggle"
                    onClick={() => toggleCategory(cat, idx)}
                  >
                    {categoryOpen ? "Collapse" : "Show dishes"}
                  </button>
                </div>
              </div>
              {categoryOpen ? (
                <div className="menu-grid">
                  {itemsForCategory.map((item) => (
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
                          <div className="field full image-field">
                            <label>Item photo</label>
                            <div className="image-upload-panel">
                              <button
                                type="button"
                                className="outline-btn"
                                onClick={() => editImageInputRef.current?.click()}
                              >
                                Change photo
                              </button>
                              {editMenuImagePreview ? (
                                <button
                                  type="button"
                                  className="ghost-btn"
                                  onClick={onEditMenuImageClearSelection}
                                >
                                  Reset selection
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="ghost-btn"
                                onClick={onEditMenuImageRemove}
                                disabled={!editMenuImageUrl && !editMenuImagePreview}
                              >
                                Remove
                              </button>
                              <input
                                ref={editImageInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => onEditMenuImageFileChange?.(e.target.files?.[0])}
                              />
                            </div>
                            {(editMenuImagePreview || editMenuImageUrl) ? (
                              <div className="image-upload-preview">
                                <img
                                  src={editMenuImagePreview || editMenuImageUrl}
                                  alt="Menu preview"
                                />
                                <span className="muted small">
                                  {editMenuImagePreview ? "New selection" : "Current image"}
                                </span>
                              </div>
                            ) : (
                              <p className="muted small">No photo yet. Upload one to highlight this dish.</p>
                            )}
                          </div>
                          <div className="menu-actions">
                            <button
                              className="primary-btn"
                              onClick={saveMenuItem}
                              disabled={menuActionId === item.id || imageUploadStatus?.edit}
                            >
                              {imageUploadStatus?.edit
                                ? "Uploading photo..."
                                : menuActionId === item.id
                                ? "Saving..."
                                : "Save"}
                            </button>
                            <button className="ghost-btn" onClick={cancelEditMenuItem}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.imageUrl ? (
                            <div className="menu-card-image">
                              <img src={item.imageUrl} alt={item.name || "Menu item"} />
                            </div>
                          ) : null}
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
              ) : (
                <div className="category-collapsed">
                  <p className="muted small">
                    {itemsForCategory.length} dishes are tucked away here to keep the dashboard tidy.
                  </p>
                  <button
                    className="ghost-btn small category-toggle"
                    onClick={() => toggleCategory(cat, idx)}
                  >
                    Show dishes
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
      {categories.length > visibleCategories.length && onViewAllClick ? (
        <div className="view-all-wrapper">
          <button className="ghost-btn small" onClick={onViewAllClick}>
            View full menu
          </button>
        </div>
      ) : null}
    </section>
  );
});

export default MenuPanel;
