import "./AdminDashboard.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../../config/api";

import StatCard from "./components/StatCard";
import WaitersPanel from "./components/WaitersPanel";
import OrdersPanel from "./components/OrdersPanel";
import TablesPanel from "./components/TablesPanel";
import StationsPanel from "./components/StationsPanel";
import AdminMenu from "./AdminMenu";
import AnalyticsPanel from "./components/AnalyticsPanel";
import {
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  fetchJson,
  formatStatus,
  getAdminOrderActions,
  getAgeLabel,
  getItemCount,
  isLagging,
  normalizeOrder
} from "./helpers";
import MenuFullModal from "./components/MenuFullModal";
import { useAdminMenu } from "./useAdminMenu";

const PANEL_META = {
  console: {
    label: "Admin Console",
    title: "Command center",
    description: "High-level snapshot of orders, staff, tables, and menu health."
  },
  stations: {
    label: "Stations",
    title: "Kitchen stations & routing",
    description: "Configure prep stations, statuses, and routing rules."
  },
  team: {
    label: "Team",
    title: "Waiter roster",
    description: "Manage waiters, pins, and access for the floor team."
  },
  orders: {
    label: "Orders",
    title: "Order review",
    description: "Track, triage, and advance incoming orders in real time."
  },
  tables: {
    label: "Tables",
    title: "Table management",
    description: "Create, activate, or retire tables used in the dining room."
  },
  analytics: {
    label: "Analytics",
    title: "Performance insights",
    description: "Orders, revenue, menu conversion, and kitchen speed in one view."
  },
  menu: {
    label: "Admin menu",
    title: "Full menu workspace",
    description: "Add dishes, edit details, and manage availability with the full menu view."
  }
};

const PANEL_IDS = Object.keys(PANEL_META);
const ACCENT_COLOR = "#2563eb";
const ACCENT_BG = "#f8fafc";
const DISABLE_ANALYTICS_API =
  String(import.meta?.env?.VITE_DISABLE_ANALYTICS_API || "").toLowerCase() === "true";

const NAV_ITEMS = [
  { id: "console", label: "Admin Console", hint: "Overview / stats", icon: "AC" },
  { id: "stations", label: "Stations", hint: "Kitchen stations & routing", icon: "ST" },
  { id: "team", label: "Team", hint: "Waiters", icon: "TM" },
  { id: "orders", label: "Orders", hint: "Order review", icon: "OR" },
  { id: "tables", label: "Tables", hint: "Table management", icon: "TB" },
  { id: "analytics", label: "Analytics", hint: "Insights & KPIs", icon: "AN" },
  { id: "menu", label: "Admin menu", hint: "Full menu workspace", icon: "MN" }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const normalizePanel = useCallback(
    (value) => (PANEL_IDS.includes(value) ? value : "console"),
    []
  );
  const [activePanel, setActivePanel] = useState(() => normalizePanel(searchParams.get("section")));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const WAITER_API = apiUrl("admin/waiters");
  const ORDERS_API = apiUrl("admin/orders");
  const TABLES_API = apiUrl("admin/tables");
  const STATIONS_API = apiUrl("admin/stations");
  const STATION_ROUTING_API = apiUrl("admin/stations/routing/map");
  const ANALYTICS_API = apiUrl("admin/analytics/summary");

  const token = localStorage.getItem("adminToken");

  const [waiters, setWaiters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [stations, setStations] = useState([]);
  const [stationRouting, setStationRouting] = useState({
    categories: {},
    items: {},
    defaultStation: null
  });

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const [analytics, setAnalytics] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState("7d");
  const [analyticsError, setAnalyticsError] = useState("");

  const [orderSearch, setOrderSearch] = useState("");
const [orderFilter, setOrderFilter] = useState("active");
const [tableNumberInput, setTableNumberInput] = useState("");
const [tableLabelInput, setTableLabelInput] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState({
    waiters: false,
    orders: false,
    refresh: false,
    tables: false,
    stations: false,
    analytics: false
  });
  const [waiterAction, setWaiterAction] = useState(false);
  const [orderActionId, setOrderActionId] = useState("");
  const [stationActionId, setStationActionId] = useState("");
  const [routingSaving, setRoutingSaving] = useState(false);
  const moreRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showFullMenuModal, setShowFullMenuModal] = useState(false);
  const { menu, loadMenu, filteredMenu, categories } = useAdminMenu({ token, setError });

  const refreshAll = async () => {
    setLoading((prev) => ({ ...prev, refresh: true }));
    await Promise.all([
      loadWaiters(),
      loadMenu(),
      loadOrders(),
      loadTables(),
      loadStations(),
      loadStationRouting()
    ]);
    await loadAnalytics(analyticsRange);
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
    const next = normalizePanel(searchParams.get("section"));
    if (next !== activePanel) {
      setActivePanel(next);
    }
  }, [searchParams, normalizePanel, activePanel]);

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

  const handlePanelChange = (panelId) => {
    const next = normalizePanel(panelId);
    setActivePanel(next);
    const params = new URLSearchParams(searchParams);
    if (next === "console") {
      params.delete("section");
    } else {
      params.set("section", next);
    }
    setSearchParams(params);
    setSidebarOpen(false);
    setMoreOpen(false);
  };

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

  const loadTables = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, tables: true }));
    try {
      const res = await fetchJson(TABLES_API, withAuth(), "Cannot load tables");
      const list = Array.isArray(res?.tables) ? res.tables : [];
      setTables(list);
    } catch (err) {
      console.error(err);
      setTables([]);
      setError(err.message || "Cannot load tables");
    } finally {
      setLoading((prev) => ({ ...prev, tables: false }));
    }
  };

  const loadStations = async () => {
    if (!token) return;
    setLoading((prev) => ({ ...prev, stations: true }));
    try {
      setError("");
      const data = await fetchJson(
        `${STATIONS_API}?includeInactive=true`,
        withAuth(),
        "Cannot load stations"
      );
      setStations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setStations([]);
      setError(err.message || "Cannot load stations");
    } finally {
      setLoading((prev) => ({ ...prev, stations: false }));
    }
  };

  const loadStationRouting = async () => {
    if (!token) return;
    try {
      const data = await fetchJson(
        STATION_ROUTING_API,
        withAuth(),
        "Cannot load station routing"
      );
      setStationRouting({
        categories: data?.categories || {},
        items: data?.items || {},
        defaultStation: data?.defaultStation || null
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Cannot load station routing");
    }
  };

  const loadAnalytics = async (range = analyticsRange) => {
    if (!token) return;
    if (DISABLE_ANALYTICS_API) {
      setAnalytics(getMockAnalytics(range));
      setAnalyticsRange(range);
      setAnalyticsError("Analytics API disabled; using sample data.");
      return;
    }
    setLoading((prev) => ({ ...prev, analytics: true }));
    try {
      setAnalyticsError("");
      const data = await fetchJson(
        `${ANALYTICS_API}?range=${encodeURIComponent(range)}`,
        withAuth(),
        "Cannot load analytics"
      );
      setAnalytics(data);
      setAnalyticsRange(range);
    } catch (err) {
      console.error(err);
      setAnalyticsError(err.message || "Cannot load analytics");
      setAnalytics(getMockAnalytics(range));
    } finally {
      setLoading((prev) => ({ ...prev, analytics: false }));
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

  // ========================= TABLES ========================= //

  const createTable = async () => {
    const num = Number(tableNumberInput);
    if (!num || num <= 0 || !tableLabelInput.trim()) {
      setError("Table number and label required");
      return;
    }
    try {
      setError("");
      await fetchJson(
        TABLES_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: num, label: tableLabelInput.trim(), active: true })
        }),
        "Could not create table"
      );
      setTableNumberInput("");
      setTableLabelInput("");
      loadTables();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not create table");
    }
  };

  const toggleTableActive = async (table) => {
    try {
      setError("");
      await fetchJson(
        `${TABLES_API}/${table.id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: table.active === false })
        }),
        "Could not update table"
      );
      loadTables();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update table");
    }
  };

  const deleteTable = async (table) => {
    const label = table?.label || `Table ${table?.number}`;
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      setError("");
      await fetchJson(
        `${TABLES_API}/${table.id}`,
        withAuth({ method: "DELETE" }),
        "Could not delete table"
      );
      loadTables();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not delete table");
    }
  };

  // ========================= STATIONS ========================= //

  const createStation = async (payload) => {
    if (!payload?.name) {
      setError("Station name is required");
      return;
    }

    try {
      setStationActionId("new");
      setError("");
      await fetchJson(
        STATIONS_API,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        "Could not create station"
      );
      await Promise.all([loadStations(), loadStationRouting()]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not create station");
    } finally {
      setStationActionId("");
    }
  };

  const updateStation = async (id, updates) => {
    if (!id) return;
    try {
      setStationActionId(id);
      setError("");
      await fetchJson(
        `${STATIONS_API}/${id}`,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        }),
        "Could not update station"
      );
      await loadStations();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not update station");
    } finally {
      setStationActionId("");
    }
  };

  const deleteStation = async (id, reassignTo = null) => {
    const target = stations.find((s) => s.id === id);
    const label = target?.name || "this station";
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      setStationActionId(id);
      setError("");
      await fetchJson(
        `${STATIONS_API}/${id}`,
        withAuth({
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reassignTo })
        }),
        "Could not delete station"
      );
      await Promise.all([loadStations(), loadStationRouting()]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not delete station");
    } finally {
      setStationActionId("");
    }
  };

  const saveStationRouting = async (config) => {
    try {
      setRoutingSaving(true);
      setError("");
      await fetchJson(
        STATION_ROUTING_API,
        withAuth({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config)
        }),
        "Could not save routing"
      );
      await loadStationRouting();
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not save routing");
    } finally {
      setRoutingSaving(false);
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

  const activeMeta = PANEL_META[activePanel] || PANEL_META.console;

  const renderPanel = () => {
    switch (activePanel) {
      case "stations":
        return (
          <StationsPanel
            stations={stations}
            routing={stationRouting}
            categories={categories}
            loading={loading.stations}
            savingRouting={routingSaving}
            stationActionId={stationActionId}
            onCreate={createStation}
            onUpdate={updateStation}
            onDelete={deleteStation}
            onSaveRouting={saveStationRouting}
            onReload={() => {
              loadStations();
              loadStationRouting();
            }}
          />
        );
      case "team":
        return (
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
        );
      case "orders":
        return (
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
        );
      case "tables":
        return (
          <TablesPanel
            tables={tables}
            loading={loading.tables}
            error=""
            formNumber={tableNumberInput}
            setFormNumber={setTableNumberInput}
            formLabel={tableLabelInput}
            setFormLabel={setTableLabelInput}
            onCreate={createTable}
            onToggleActive={toggleTableActive}
            onDelete={deleteTable}
            onReload={loadTables}
          />
        );
      case "analytics":
        return (
          <AnalyticsPanel
            analytics={analytics}
            loading={loading.analytics}
            error={analyticsError}
            activeRange={analyticsRange}
            onRangeChange={loadAnalytics}
            onReload={() => loadAnalytics(analyticsRange)}
          />
        );
      case "menu":
        return (
          <AdminMenu embedded />
        );
      case "console":
      default:
        return (
          <div className="admin-panel wide console-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow-1 soft">Overview</p>
                <h3>Operations snapshot</h3>
                <p className="muted small">
                  Live counts across orders, staff, tables, and menu. Use the sidebar to drill into a module.
                </p>
              </div>
              <div className="panel-actions">
                <button
                  className="ghost-btn small"
                  type="button"
                  onClick={refreshAll}
                  disabled={loading.refresh}
                >
                  {loading.refresh ? "Refreshing..." : "Refresh all"}
                </button>
              </div>
            </div>

            <div className="stats-grid console-stats">
              <StatCard label="Active orders" value={stats.activeOrders} hint="New, accepted, prep" />
              <StatCard label="Ready for pickup" value={stats.readyOrders} hint="Marked ready" />
              <StatCard label="Waiters" value={stats.waiters} hint="Onboarded staff" />
              <StatCard label="Menu items" value={stats.menuCount} hint={`${stats.categories} categories`} />
              <StatCard label="Available menu" value={stats.availableMenu} hint="Live for ordering" />
              <StatCard label="Tables" value={tables.length} hint="Configured tables" />
            </div>

            <div className="quick-links">
              <p className="muted small">Jump to a module</p>
              <div className="quick-links-row">
                <button className="pill-btn" type="button" onClick={() => handlePanelChange("orders")}>
                  Orders
                </button>
                <button className="pill-btn" type="button" onClick={() => handlePanelChange("stations")}>
                  Stations
                </button>
                <button className="pill-btn" type="button" onClick={() => handlePanelChange("team")}>
                  Team
                </button>
                <button className="pill-btn" type="button" onClick={() => handlePanelChange("tables")}>
                  Tables
                </button>
                <button className="pill-btn" type="button" onClick={() => handlePanelChange("menu")}>
                  Menu
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="admin-dashboard" style={{ "--section-accent": ACCENT_COLOR, "--section-bg-soft": ACCENT_BG }}>
      <div className="admin-shell">
        <AdminSidebar items={NAV_ITEMS} active={activePanel} onSelect={handlePanelChange} open={sidebarOpen} />

        <div className="admin-content">
          <header className="admin-hero">
            <div>
              <p className="eyebrow-1">{activeMeta.label}</p>
              <h1 className="hero-title">{activeMeta.title}</h1>
              <p className="muted">{activeMeta.description}</p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="ghost-btn sidebar-toggle mobile-only"
                  onClick={() => setSidebarOpen(true)}
                >
                  Open navigation
                </button>
                <button className="ghost-btn" onClick={refreshAll} disabled={loading.refresh}>
                  {loading.refresh ? "Refreshing..." : "Refresh data"}
                </button>
                <button className="outline-btn" onClick={() => handlePanelChange("menu")}>
                  Open menu workspace
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
                          handlePanelChange("menu");
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

            <div className="hero-meta">
              <div className="hero-pills">
                <span className="pill light">{stats.activeOrders} active</span>
                <span className="pill subtle">{stats.availableMenu} menu live</span>
                <span className="pill subtle">{waiters.length} waiters</span>
              </div>
            </div>
          </header>

          {error ? <div className="admin-alert">{error}</div> : null}

          <div className="admin-content-body">{renderPanel()}</div>
        </div>
      </div>

      {sidebarOpen ? <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} /> : null}

      <MenuFullModal
        open={showFullMenuModal}
        onClose={() => setShowFullMenuModal(false)}
        categories={categories}
        filteredMenu={filteredMenu}
      />
    </div>
  );
}

function AdminSidebar({ items, active, onSelect, open }) {
  return (
    <aside className={`admin-sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        <div>
          <p className="eyebrow-1 soft">Admin</p>
          <h3 className="sidebar-title">Control board</h3>
          <p className="muted small">Pick a module to manage.</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-item ${active === item.id ? "active" : ""}`}
            onClick={() => onSelect(item.id)}
            aria-current={active === item.id ? "page" : undefined}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="nav-labels">
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function getMockAnalytics(range = "7d") {
  const now = new Date();
  const labels = Array.from({ length: range === "30d" ? 14 : 7 }).map((_, idx) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (range === "30d" ? (13 - idx) * 2 : 6 - idx));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
  const ordersOverTime = labels.map((label, idx) => ({
    label,
    value: Math.round(40 + Math.sin(idx) * 15 + idx * 2)
  }));

  return {
    range,
    kpis: {
      ordersToday: 86,
      orders7d: 540,
      orders30d: 2180,
      revenue: 1840000,
      aov: 34500,
      peakHour: "19:00",
      cancellationRate: 0.04,
      prepTimeAvg: 11
    },
    ordersOverTime,
    peakHours: [
      { label: "11:00", value: 22 },
      { label: "13:00", value: 48 },
      { label: "15:00", value: 30 },
      { label: "17:00", value: 38 },
      { label: "19:00", value: 72 },
      { label: "21:00", value: 55 }
    ],
    statusBreakdown: [
      { label: "New", value: 42 },
      { label: "Preparing", value: 38 },
      { label: "Ready", value: 21 },
      { label: "Delivered", value: 318 },
      { label: "Cancelled", value: 8 }
    ],
    deviceBreakdown: [
      { label: "QR / Guest", value: 62 },
      { label: "Waiter Tablet", value: 34 },
      { label: "Admin", value: 4 }
    ],
    topItems: [
      { name: "Margherita Pizza", orders: 182, views: 340, revenue: 980000 },
      { name: "Caesar Salad", orders: 143, views: 240, revenue: 515000 },
      { name: "BBQ Wings", orders: 131, views: 260, revenue: 472000 }
    ],
    lowItems: [
      { name: "Gazpacho", orders: 9, views: 68, revenue: 42000 },
      { name: "Tiramisu", orders: 12, views: 92, revenue: 88000 }
    ],
    viewedNotOrdered: [
      { name: "Truffle Fries", views: 210, orders: 24 },
      { name: "Vegan Burger", views: 160, orders: 18 }
    ],
    tables: [
      { table: "Patio 1", orders: 42, revenue: 280000 },
      { table: "Patio 2", orders: 38, revenue: 242000 },
      { table: "Hall A", orders: 56, revenue: 368000 }
    ]
  };
}
