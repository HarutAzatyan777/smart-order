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
import { normalizeMenuPayload, parseMenuFile } from "./importers";
import MenuFullModal from "./components/MenuFullModal";
import { uploadMenuImage } from "../../utils/uploadMenuImage";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const WAITER_API = apiUrl("admin/waiters");
  const ORDERS_API = apiUrl("admin/orders");
  const MENU_API = apiUrl("admin/menu");

  const token = localStorage.getItem("adminToken");

  const [waiters, setWaiters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  // menu fields
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [menuImagePreview, setMenuImagePreview] = useState("");

  // edit menu fields
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPrice, setEditMenuPrice] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");
  const [editMenuImageFile, setEditMenuImageFile] = useState(null);
  const [editMenuImagePreview, setEditMenuImagePreview] = useState("");
  const [editMenuImageUrl, setEditMenuImageUrl] = useState("");
  const [editMenuImageCleared, setEditMenuImageCleared] = useState(false);

  const [menuSearch, setMenuSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("active");
  const [menuFilter, setMenuFilter] = useState("all");
  const [importingMenu, setImportingMenu] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [imageUploadStatus, setImageUploadStatus] = useState({
    create: false,
    edit: false
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState({
    waiters: false,
    menu: false,
    orders: false,
    refresh: false
  });
  const [waiterAction, setWaiterAction] = useState(false);
  const [menuActionId, setMenuActionId] = useState("");
  const [orderActionId, setOrderActionId] = useState("");
  const menuPanelRef = useRef(null);
  const moreRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showFullMenuModal, setShowFullMenuModal] = useState(false);

  useEffect(() => {
    return () => {
      if (menuImagePreview) {
        URL.revokeObjectURL(menuImagePreview);
      }
    };
  }, [menuImagePreview]);

  useEffect(() => {
    return () => {
      if (editMenuImagePreview) {
        URL.revokeObjectURL(editMenuImagePreview);
      }
    };
  }, [editMenuImagePreview]);

  const handleMenuImageFileChange = (file) => {
    if (file && !file.type.startsWith("image/")) {
      setError("Select a valid image file for the menu photo.");
      return;
    }

    setMenuImageFile(file || null);
    setMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (!file) return "";
      return URL.createObjectURL(file);
    });
  };

  const clearMenuImageSelection = () => {
    setMenuImageFile(null);
    setMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const handleEditMenuImageFileChange = (file) => {
    if (file && !file.type.startsWith("image/")) {
      setError("Select a valid image file for the menu photo.");
      return;
    }

    setEditMenuImageCleared(false);
    setEditMenuImageFile(file || null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      if (!file) return "";
      return URL.createObjectURL(file);
    });
  };

  const clearEditMenuImageSelection = () => {
    setEditMenuImageFile(null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setEditMenuImageCleared(false);
  };

  const resetEditImagePreview = () => {
    setEditMenuImageFile(null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const removeEditMenuImage = () => {
    if (!editMenuImageUrl && !editMenuImagePreview) return;
    setEditMenuImageFile(null);
    setEditMenuImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setEditMenuImageUrl("");
    setEditMenuImageCleared(true);
  };

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

  const importMenuFile = async (file) => {
    if (!file) return;
    setImportingMenu(true);
    setImportSummary(null);
    setError("");

    try {
      const parsedRows = await parseMenuFile(file);
      const payloads = parsedRows
        .map(normalizeMenuPayload)
        .filter(Boolean);

      if (!payloads.length) {
        throw new Error("No valid rows found. Please check headers: name, price, category, description, available");
      }

      const summary = { created: 0, skipped: parsedRows.length - payloads.length, failed: [] };

      for (const payload of payloads) {
        try {
          await fetchJson(
            MENU_API,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }),
            "Could not add menu item"
          );
          summary.created += 1;
        } catch (err) {
          summary.failed.push({ name: payload.name, error: err.message || "Unknown error" });
        }
      }

      setImportSummary(summary);
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Import failed");
    } finally {
      setImportingMenu(false);
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

  const loadMenu = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, menu: true }));
    try {
      setError("");
      const data = await fetchJson(MENU_API, withAuth(), "Cannot load menu");
      const normalized = Array.isArray(data)
        ? data.map((item) => ({ ...item, price: Number(item.price) || 0 }))
        : [];
      setMenu(normalized);
    } catch (err) {
      console.error(err);
      setMenu([]);
      setError(err.message || "Cannot load menu");
    } finally {
      setLoading((prev) => ({ ...prev, menu: false }));
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

  // ========================= MENU CRUD ========================= //

  const addMenuItem = async () => {
    if (!menuName.trim() || !menuPrice || !menuCategory.trim()) {
      setError("Menu name, price, and category required");
      return;
    }

    let uploadedImageUrl = null;
    try {
      if (menuImageFile) {
        setImageUploadStatus((prev) => ({ ...prev, create: true }));
        uploadedImageUrl = await uploadMenuImage(menuImageFile, token);
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.message || "Could not upload image");
      return;
    } finally {
      setImageUploadStatus((prev) => ({ ...prev, create: false }));
    }

    const payload = {
      name: menuName.trim(),
      price: Number(menuPrice),
      category: menuCategory.trim(),
      description: menuDescription.trim(),
      available: true,
      imageUrl: uploadedImageUrl || null
    };

    try {
      setMenuActionId("new");
      setError("");
      await fetchJson(
        MENU_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not add menu item"
      );

      setMenuName("");
      setMenuPrice("");
      setMenuCategory("");
      setMenuDescription("");
      clearMenuImageSelection();
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not add menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const startEditMenuItem = (item) => {
    setEditingMenuId(item.id);
    setEditMenuName(item.name);
    setEditMenuPrice(item.price);
    setEditMenuCategory(item.category);
    setEditMenuDescription(item.description || "");
    resetEditImagePreview();
    setEditMenuImageUrl(item.imageUrl || "");
    setEditMenuImageCleared(false);
  };

  const cancelEditMenuItem = () => {
    setEditingMenuId(null);
    setEditMenuName("");
    setEditMenuPrice("");
    setEditMenuCategory("");
    setEditMenuDescription("");
    resetEditImagePreview();
    setEditMenuImageUrl("");
    setEditMenuImageCleared(false);
  };

  const saveMenuItem = async () => {
    if (!editingMenuId) return;

    if (!editMenuName.trim() || !editMenuPrice || !editMenuCategory.trim()) {
      setError("Menu name, price, and category required");
      return;
    }

    let uploadedImageUrl;
    if (editMenuImageFile) {
      try {
        setImageUploadStatus((prev) => ({ ...prev, edit: true }));
        uploadedImageUrl = await uploadMenuImage(editMenuImageFile, token);
      } catch (uploadError) {
        console.error(uploadError);
        setError(uploadError.message || "Could not upload image");
        return;
      } finally {
        setImageUploadStatus((prev) => ({ ...prev, edit: false }));
      }
    } else if (editMenuImageCleared) {
      uploadedImageUrl = null;
    }

    const payload = {
      name: editMenuName.trim(),
      price: Number(editMenuPrice),
      category: editMenuCategory.trim(),
      description: editMenuDescription.trim()
    };

    if (uploadedImageUrl !== undefined) {
      payload.imageUrl = uploadedImageUrl;
    }

    try {
      setMenuActionId(editingMenuId);
      setError("");
      await fetchJson(
        `${MENU_API}/${editingMenuId}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not update menu item"
      );
      cancelEditMenuItem();
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update menu item");
    } finally {
      setMenuActionId("");
    }
  };

  const toggleMenuAvailability = async (item) => {
    try {
      setMenuActionId(item.id);
      await fetchJson(
        `${MENU_API}/${item.id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available: item.available === false ? true : false })
        }),
        "Could not update availability"
      );
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update availability");
    } finally {
      setMenuActionId("");
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm("Delete menu item?")) return;

    try {
      setMenuActionId(id);
      await fetchJson(`${MENU_API}/${id}`, withAuth({ method: "DELETE" }), "Could not delete menu item");
      loadMenu();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not delete menu item");
    } finally {
      setMenuActionId("");
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

  const filteredMenu = useMemo(() => {
    const term = menuSearch.trim().toLowerCase();
    const filteredByVisibility = menu.filter((item) => {
      if (menuFilter === "available" && item.available === false) return false;
      if (menuFilter === "unavailable" && item.available !== false) return false;
      return true;
    });
    if (!term) return filteredByVisibility;
    return filteredByVisibility.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      return name.includes(term) || desc.includes(term) || cat.includes(term);
    });
  }, [menu, menuSearch, menuFilter]);

  const categories = useMemo(() => {
    const set = new Set(filteredMenu.map((m) => m.category || "Uncategorized"));
    return Array.from(set).sort();
  }, [filteredMenu]);

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
                    menuPanelRef.current?.scrollIntoView({ behavior: "smooth" });
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
          loadingMenu={loading.menu}
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
          onViewAllClick={() => setShowFullMenuModal(true)}
        />
      </div>
    </div>
  );
}
