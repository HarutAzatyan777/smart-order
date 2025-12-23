import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES, getMenuField, localizeMenuItem } from "../../../utils/menuI18n";

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
  menuNameHy,
  setMenuNameHy,
  menuCategoryHy,
  setMenuCategoryHy,
  menuDescriptionHy,
  setMenuDescriptionHy,
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
  editMenuNameHy,
  setEditMenuNameHy,
  editMenuCategoryHy,
  setEditMenuCategoryHy,
  editMenuDescriptionHy,
  setEditMenuDescriptionHy,
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
  setMenuFilter,
  onMoveCategory,
  onRenameCategory,
  categoryAction,
  enableCategoryEditor = false,
  onDeleteAllMenu,
  bulkDeleting = false,
  language = "en",
  onLanguageChange,
  categoryOrder = [],
  savingCategoryOrder = false
}, ref) {
  const visibleCategories =
    maxCategoryList === Infinity ? categories : categories.slice(0, maxCategoryList);
  const localizedMenu = useMemo(
    () =>
      filteredMenu.map((item) => ({
        item,
        display: localizeMenuItem(item, language)
      })),
    [filteredMenu, language]
  );
  const categoryLabels = useMemo(() => {
    const map = {};
    localizedMenu.forEach(({ item, display }) => {
      const key = item.category || "Uncategorized";
      if (!map[key]) map[key] = display.displayCategory || key;
    });
    return map;
  }, [localizedMenu]);
  const fileInputRef = useRef(null);
  const menuImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  const [openCategories, setOpenCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
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

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategory("");
      setCategoryDraft("");
      return;
    }
    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
      setCategoryDraft(categories[0] || "");
    }
  }, [categories, selectedCategory]);

  const categoryBusy = Boolean(categoryAction);

  const handleCategoryRename = () => {
    if (!selectedCategory || !categoryDraft.trim()) return;
    onRenameCategory?.(selectedCategory, categoryDraft);
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
          <div className="lang-switch">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`ghost-btn small ${language === lang.code ? "active" : ""}`}
                onClick={() => onLanguageChange?.(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
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
          <button
            className="danger-btn"
            onClick={onDeleteAllMenu}
            disabled={loadingMenu || bulkDeleting}
          >
            {bulkDeleting ? "Deleting all..." : "Delete all"}
          </button>
        </div>
      </div>

      <div className="import-box">
        <div className="import-text">
          <p className="eyebrow soft">Bulk import</p>
          <p className="muted small">
            Upload .xlsx, .csv, or .docx with columns: name, price, category, description, available, name_hy, category_hy, description_hy.
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

      {enableCategoryEditor ? (
        <div className="category-manager">
          <div className="category-manager-header">
            <p className="eyebrow soft">Category controls</p>
            <p className="muted small">
              Reorder how categories appear and rename them without editing every dish.
            </p>
          </div>
          {categories.length === 0 ? (
            <p className="muted small">Add a menu item to create your first category.</p>
          ) : (
            <>
              <div className="category-manager-list">
                {categories.map((cat, idx) => (
                  <div key={cat} className="category-manager-row">
                    <span className="category-label">{categoryLabels[cat] || cat}</span>
                    <div className="category-manager-actions">
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => onMoveCategory?.(cat, -1)}
                        disabled={!onMoveCategory || idx === 0 || categoryBusy || savingCategoryOrder}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => onMoveCategory?.(cat, 1)}
                        disabled={
                          !onMoveCategory ||
                          idx === categories.length - 1 ||
                          categoryBusy ||
                          savingCategoryOrder
                        }
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        className="ghost-btn small"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCategoryDraft(cat);
                        }}
                        disabled={categoryBusy}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="category-rename-row">
                <select
                  className="admin-input"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCategoryDraft(e.target.value);
                  }}
                  disabled={!categories.length || categoryBusy}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat] || cat}
                    </option>
                  ))}
                </select>
                <input
                  className="admin-input"
                  placeholder="New category name"
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value)}
                  disabled={!selectedCategory || categoryBusy}
                />
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleCategoryRename}
                  disabled={
                    !selectedCategory ||
                    !categoryDraft.trim() ||
                    categoryDraft === selectedCategory ||
                    categoryBusy
                  }
                >
                  {categoryBusy ? "Saving..." : "Save category name"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

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
        <div className="field">
          <label>Item name (Armenian)</label>
          <input
            className="admin-input"
            placeholder="Տարածված անուն"
            value={menuNameHy}
            onChange={(e) => setMenuNameHy(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Category (Armenian)</label>
          <input
            className="admin-input"
            placeholder="Խմիչքներ, Պիցցա..."
            value={menuCategoryHy}
            onChange={(e) => setMenuCategoryHy(e.target.value)}
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
        <div className="field full">
          <label>Description (Armenian)</label>
          <textarea
            className="admin-textarea"
            rows="2"
            placeholder="Կարճ նկարագրություն"
            value={menuDescriptionHy}
            onChange={(e) => setMenuDescriptionHy(e.target.value)}
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
          const itemsForCategory = localizedMenu.filter(
            ({ item }) => (item.category || "Uncategorized") === cat
          );
          if (!itemsForCategory.length) return null;
          const categoryOpen = isCategoryOpen(cat, idx);
          return (
            <div key={cat} className="category-block" data-open={categoryOpen ? "true" : "false"}>
              <div className="category-header">
                <h3>{categoryLabels[cat] || cat}</h3>
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
                  {itemsForCategory.map(({ item, display }) => (
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
                          <input
                            className="admin-input"
                            value={editMenuNameHy}
                            onChange={(e) => setEditMenuNameHy(e.target.value)}
                            placeholder="Item name (Armenian)"
                          />
                          <input
                            className="admin-input"
                            value={editMenuCategoryHy}
                            onChange={(e) => setEditMenuCategoryHy(e.target.value)}
                            placeholder="Category (Armenian)"
                          />
                          <textarea
                            className="admin-textarea"
                            value={editMenuDescription}
                            onChange={(e) => setEditMenuDescription(e.target.value)}
                            placeholder="Description"
                          />
                          <textarea
                            className="admin-textarea"
                            value={editMenuDescriptionHy}
                            onChange={(e) => setEditMenuDescriptionHy(e.target.value)}
                            placeholder="Description (Armenian)"
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
                              <p className="muted small">
                                {display.displayCategory || item.category || "Uncategorized"}
                              </p>
                              <h4>{display.displayName || item.name}</h4>
                              <p className="price">{formatCurrency(item.price)}</p>
                            </div>
                            <span
                              className={`status-chip ${item.available === false ? "status-muted" : "status-live"}`}
                            >
                              {item.available === false ? "Unavailable" : "Available"}
                            </span>
                          </div>
                          <p className="muted">
                            {display.displayDescription || item.description || "No description provided."}
                          </p>
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
