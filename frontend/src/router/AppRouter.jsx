import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "../components/header/Header";
import FloatingContact from "../components/FloatingContact/FloatingContact";
import { initAnalytics, setAnalyticsContext, trackPageView } from "../utils/analytics";

// HOME
import Home from "../pages/home/Home";
import MenuPage from "../pages/menu/menu";
import Contact from "../pages/contact/Contact";
import Privacy from "../pages/Privacy";

// WAITER
import WaiterLogin from "../pages/waiter/WaiterLogin";
import WaiterHome from "../pages/waiter/WaiterHome";
import WaiterOrderCreate from "../pages/waiter/WaiterOrderCreate";
import WaiterSelectTable from "../pages/waiter/WaiterSelectTable";

// KITCHEN
import KitchenDashboard from "../pages/kitchen/KitchenDashboard";

// ADMIN
import AdminDashboard from "../pages/AdminDashboard/AdminDashboard";
import AdminLogin from "../pages/AdminDashboard/AdminLogin";
import WaiterMenu from "../pages/waiter/WaiterMenu";
import AdminMenu from "../pages/AdminDashboard/AdminMenu";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <RouterShell />
    </BrowserRouter>
  );
}

function RouterShell() {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith("/menu");
  const hideFloatingContact =
    location.pathname.startsWith("/menu") || location.pathname.startsWith("/waiter/create");
  const roleForPath = (pathname) => {
    if (pathname.startsWith("/waiter")) return "waiter";
    if (pathname.startsWith("/kitchen")) return "kitchen";
    if (pathname.startsWith("/admin")) return "admin";
    return "guest";
  };

  useEffect(() => {
    initAnalytics();
    if (typeof window !== "undefined") {
      setAnalyticsContext({ location: window.location.hostname });
    }
  }, []);

  useEffect(() => {
    const userRole = roleForPath(location.pathname);
    setAnalyticsContext({ userRole });
    trackPageView({
      page_path: location.pathname + location.search,
      page_location: typeof window !== "undefined" ? window.location.href : undefined,
      page_title: typeof document !== "undefined" ? document.title : undefined
    });
  }, [location]);

  return (
    <>
      {!hideHeader && <Header />}
      {!hideFloatingContact && <FloatingContact />}
      <Routes>
        {/* HOME */}
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* WAITER */}
        <Route path="/waiter" element={<WaiterLogin />} />
        <Route path="/waiter/login" element={<WaiterLogin />} />
        <Route path="/waiter/home" element={<WaiterHome />} />
        <Route path="/waiter/select-table" element={<WaiterSelectTable />} />
        <Route path="/waiter/create" element={<WaiterOrderCreate />} />
        <Route path="/waiter/menu" element={<WaiterMenu />} />


        {/* KITCHEN */}
        <Route path="/kitchen" element={<KitchenDashboard />} />

        {/* ADMIN LOGIN */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* ADMIN DASHBOARD (PROTECTED) */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/menu"
          element={
            <AdminProtectedRoute>
              <AdminMenu />
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
