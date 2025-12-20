import "./AdminDashboard.css";
import "./AdminMenu.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MenuPanel from "./components/MenuPanel";
import { formatCurrency } from "./helpers";
import { useAdminMenu } from "./useAdminMenu";

export default function AdminMenu() {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");
  const [error, setError] = useState("");
  const panelRef = useRef(null);

  const {
    menu,
    menuName,
    setMenuName,
    menuPrice,
    setMenuPrice,
    menuCategory,
    setMenuCategory,
    menuDescription,
    setMenuDescription,
    menuImagePreview,
    handleMenuImageFileChange,
    clearMenuImageSelection,
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
    editMenuImagePreview,
    editMenuImageUrl,
    handleEditMenuImageFileChange,
    clearEditMenuImageSelection,
    removeEditMenuImage,
    addMenuItem,
    saveMenuItem,
    toggleMenuAvailability,
    deleteMenuItem,
    menuActionId,
    imageUploadStatus,
    importingMenu,
    importSummary,
    importMenuFile,
    loadMenu,
    menuSearch,
    setMenuSearch,
    menuFilter,
    setMenuFilter,
    filteredMenu,
    categories,
    loadingMenu
  } = useAdminMenu({ token, setError });

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    loadMenu();
  }, [token, navigate, loadMenu]);

  const availableMenu = menu.filter((m) => m.available !== false).length;

  return (
    <div className="admin-dashboard admin-menu-page">
      <header className="admin-menu-hero">
        <div>
          <p className="eyebrow">Admin menu</p>
          <h1 className="hero-title">Full menu workspace</h1>
          <p className="muted">
            Add dishes, edit details, and manage availability with the full menu view.
          </p>
          <div className="admin-menu-meta">
            <span className="pill subtle">{menu.length} items</span>
            <span className="pill subtle">{categories.length} categories</span>
            <span className="pill subtle">{availableMenu} available</span>
          </div>
        </div>
        <div className="admin-menu-actions">
          <button className="ghost-btn" type="button" onClick={() => navigate("/admin")}>
            Back to dashboard
          </button>
          <button
            className="outline-btn"
            type="button"
            onClick={loadMenu}
            disabled={loadingMenu || importingMenu}
          >
            {loadingMenu ? "Refreshing..." : "Reload menu"}
          </button>
        </div>
      </header>

      {error ? <div className="admin-alert">{error}</div> : null}

      <div className="admin-menu-panel">
        <MenuPanel
          ref={panelRef}
          menuSearch={menuSearch}
          setMenuSearch={setMenuSearch}
          loadingMenu={loadingMenu}
          menuName={menuName}
          setMenuName={setMenuName}
          menuPrice={menuPrice}
          setMenuPrice={setMenuPrice}
          menuCategory={menuCategory}
          setMenuCategory={setMenuCategory}
          menuDescription={menuDescription}
          setMenuDescription={setMenuDescription}
          addMenuItem={addMenuItem}
          imageUploadStatus={imageUploadStatus}
          menuImagePreview={menuImagePreview}
          onMenuImageFileChange={handleMenuImageFileChange}
          onMenuImageClear={clearMenuImageSelection}
          categories={categories}
          filteredMenu={filteredMenu}
          editingMenuId={editingMenuId}
          startEditMenuItem={startEditMenuItem}
          cancelEditMenuItem={cancelEditMenuItem}
          editMenuName={editMenuName}
          setEditMenuName={setEditMenuName}
          editMenuPrice={editMenuPrice}
          setEditMenuPrice={setEditMenuPrice}
          editMenuCategory={editMenuCategory}
          setEditMenuCategory={setEditMenuCategory}
          editMenuDescription={editMenuDescription}
          setEditMenuDescription={setEditMenuDescription}
          editMenuImagePreview={editMenuImagePreview}
          editMenuImageUrl={editMenuImageUrl}
          onEditMenuImageFileChange={handleEditMenuImageFileChange}
          onEditMenuImageClearSelection={clearEditMenuImageSelection}
          onEditMenuImageRemove={removeEditMenuImage}
          saveMenuItem={saveMenuItem}
          toggleMenuAvailability={toggleMenuAvailability}
          deleteMenuItem={deleteMenuItem}
          menuActionId={menuActionId}
          formatCurrency={formatCurrency}
          importingMenu={importingMenu}
          importSummary={importSummary}
          importMenuFile={importMenuFile}
          onReload={loadMenu}
          menuFilter={menuFilter}
          setMenuFilter={setMenuFilter}
        />
      </div>
    </div>
  );
}
