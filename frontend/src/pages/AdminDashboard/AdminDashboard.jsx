import "./AdminDashboard.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/api";

import StatCard from "./components/StatCard";
import WaitersPanel from "./components/WaitersPanel";
import MenuPanel from "./components/MenuPanel";
import OrdersPanel from "./components/OrdersPanel";
import {
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  fetchJson,
  formatCurrency,
  formatStatus,
  getAdminOrderActions,
  getAgeLabel,
  getItemCount,
  isLagging,
  normalizeOrder
} from "./helpers";
import MenuFullModal from "./components/MenuFullModal";
import { useAdminMenu } from "./useAdminMenu";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const WAITER_API = apiUrl("admin/waiters");
  const ORDERS_API = apiUrl("admin/orders");

  const token = localStorage.getItem("adminToken");

  const [waiters, setWaiters] = useState([]);
  const [orders, setOrders] = useState([]);

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("active");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState({
    waiters: false,
    orders: false,
    refresh: false
  });
  const [waiterAction, setWaiterAction] = useState(false);
  const [orderActionId, setOrderActionId] = useState("");
  const menuPanelRef = useRef(null);
  const moreRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showFullMenuModal, setShowFullMenuModal] = useState(false);
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

  const refreshAll = async () => {
    setLoading((prev) => ({ ...prev, refresh: true }));
    await Promise.all([loadWaiters(), loadMenu(), loadOrders()]);
    setLoading((prev) => ({ ...prev, refresh: false }));
  };

  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }

    refreshAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const withAuth = (options = {}) => ({
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminEmail");
    navigate("/admin/login");
  };

  // ========================= LOADERS ========================= //

  const loadWaiters = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, waiters: true }));
    try {
      setError("");
      const data = await fetchJson(WAITER_API, withAuth(), "Cannot load waiter list");
      setWaiters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setWaiters([]);
      setError(err.message || "Cannot load waiter list");
    } finally {
      setLoading((prev) => ({ ...prev, waiters: false }));
    }
  };

  const loadOrders = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, orders: true }));
    try {
      setError("");
      const data = await fetchJson(ORDERS_API, withAuth(), "Cannot load orders");
      const normalized = Array.isArray(data) ? data.map(normalizeOrder) : [];
      setOrders(normalized);
    } catch (err) {
      console.error(err);
      setOrders([]);
      setError(err.message || "Cannot load orders");
    } finally {
      setLoading((prev) => ({ ...prev, orders: false }));
    }
  };

  // ========================= WAITERS ========================= //

  const addWaiter = async () => {
    if (!name.trim() || !pin.trim()) {
      setError("Name and PIN required");
      return;
    }

    try {
      setWaiterAction(true);
      setError("");
      await fetchJson(
        WAITER_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), pin: pin.trim() })
        }),
        "Could not add waiter"
      );
      setName("");
      setPin("");
      loadWaiters();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not add waiter");
    } finally {
      setWaiterAction(false);
    }
  };

  const deleteWaiter = async (id) => {
    const target = waiters.find((w) => w.id === id);
    const label = target?.name || "this waiter";
    if (!window.confirm(`Delete ${label}?`)) return;

    try {
      setWaiterAction(true);
      await fetchJson(`${WAITER_API}/${id}`, withAuth({ method: "DELETE" }), "Could not delete waiter");
      loadWaiters();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not delete waiter");
    } finally {
      setWaiterAction(false);
    }
  };

  // ========================= ORDERS ========================= //

  const updateOrderStatus = async (id, status) => {
    try {
      setOrderActionId(id);
      setError("");
      await fetchJson(
        `${ORDERS_API}/${id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }),
        "Could not update order"
      );
      loadOrders();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update order");
    } finally {
      setOrderActionId("");
    }
  };

  // ========================= DERIVED ========================= //

  const filteredOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();

    return [...orders]
      .filter((o) => {
        if (orderFilter === "active" && CLOSED_STATUSES.has(o.status)) return false;
        if (orderFilter === "ready" && o.status !== "ready") return false;
        if (!term) return true;

        const haystack = [
          String(o.table || "").toLowerCase(),
          String(o.waiterName || "").toLowerCase(),
          String(o.status || "").toLowerCase(),
          String(o.notes || "").toLowerCase()
        ];

        if (Array.isArray(o.items)) {
          haystack.push(
            o.items
              .map((i) => (i?.name || i || "").toString().toLowerCase())
              .join(" ")
          );
        }

        return haystack.some((value) => value.includes(term));
      })
      .sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.getTime() : 0;
        const tB = b.createdAt ? b.createdAt.getTime() : 0;
        return tB - tA;
      });
  }, [orders, orderFilter, orderSearch]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
    const readyOrders = orders.filter((o) => o.status === "ready").length;
    const closedOrders = orders.filter((o) => CLOSED_STATUSES.has(o.status)).length;
    const availableMenu = menu.filter((m) => m.available !== false).length;
    const categoriesCount = new Set(menu.map((m) => m.category || "Uncategorized")).size;

    return {
      waiters: waiters.length,
      orders: orders.length,
      activeOrders,
      readyOrders,
      closedOrders,
      menuCount: menu.length,
      availableMenu,
      categories: categoriesCount
    };
  }, [orders, menu, waiters]);

  // ========================= RENDER ========================= //

  return (
    <div className="admin-dashboard">
      <header className="admin-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="hero-title">Command center</h1>
          <p className="muted">
            Manage staff, menu, and orders from one dashboard. Data is pulled live from the API.
          </p>
        <div className="hero-actions">
          <button className="ghost-btn" onClick={refreshAll} disabled={loading.refresh}>
            {loading.refresh ? "Refreshing..." : "Refresh data"}
          </button>
          <button className="outline-btn" onClick={() => navigate("/admin/menu")}>
            Open menu page
          </button>
          <div className="more-dropdown" ref={moreRef}>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={moreOpen}
            >
              More
            </button>
            {moreOpen ? (
              <div className="more-menu-content">
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => {
                    navigate("/admin/menu");
                    setMoreOpen(false);
                  }}
                >
                  Manage menu
                </button>
                <button
                  type="button"
                  className="ghost-btn small"
                  onClick={() => {
                    setShowFullMenuModal(true);
                    setMoreOpen(false);
                  }}
                >
                  View full menu window
                </button>
              </div>
            ) : null}
          </div>
          <span className="pill live-chip">Secured with admin token</span>
          <button className="danger-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        </div>

        <div className="stats-grid">
          <StatCard label="Active orders" value={stats.activeOrders} hint="New, accepted, prep" />
          <StatCard label="Menu items" value={stats.menuCount} hint={`${stats.categories} categories`} />
          <StatCard label="Waiters" value={stats.waiters} hint="Onboarded staff" />
          <StatCard label="Ready for pickup" value={stats.readyOrders} hint="Orders marked ready" />
        </div>
      </header>

      {error ? <div className="admin-alert">{error}</div> : null}

      
        <WaitersPanel
          waiters={waiters}
          loading={loading.waiters}
          waiterAction={waiterAction}
          name={name}
          pin={pin}
          onNameChange={setName}
          onPinChange={setPin}
          onAdd={addWaiter}
          onDelete={deleteWaiter}
          onReload={loadWaiters}
        />

      {/* Orders */}
      <OrdersPanel
        filteredOrders={filteredOrders}
        loadingOrders={loading.orders}
        orderFilter={orderFilter}
        setOrderFilter={setOrderFilter}
        orderSearch={orderSearch}
        setOrderSearch={setOrderSearch}
        updateOrderStatus={updateOrderStatus}
        orderActionId={orderActionId}
        getAdminOrderActions={getAdminOrderActions}
        getAgeLabel={getAgeLabel}
        getItemCount={getItemCount}
        formatStatus={formatStatus}
        isLagging={isLagging}
        onReload={loadOrders}
      />
      <MenuFullModal
        open={showFullMenuModal}
        onClose={() => setShowFullMenuModal(false)}
        categories={categories}
        filteredMenu={filteredMenu}
      />
      <div className="panel-grid">
      

        <MenuPanel
          ref={menuPanelRef}
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
          maxCategoryList={3}
          menuFilter={menuFilter}
          setMenuFilter={setMenuFilter}
          onViewAllClick={() => navigate("/admin/menu")}
        />
      </div>
    </div>
  );
}
