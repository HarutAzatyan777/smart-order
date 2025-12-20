import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "../components/header/Header";

// HOME
import Home from "../pages/home/Home";
import MenuPage from "../pages/menu/menu";

// WAITER
import WaiterLogin from "../pages/waiter/WaiterLogin";
import WaiterHome from "../pages/waiter/WaiterHome";
import WaiterOrderCreate from "../pages/waiter/WaiterOrderCreate";

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

  return (
    <>
      {!hideHeader && <Header />}
      <Routes>
        {/* HOME */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<MenuPage />} />

        {/* WAITER */}
        <Route path="/waiter" element={<WaiterLogin />} />
        <Route path="/waiter/login" element={<WaiterLogin />} />
        <Route path="/waiter/home" element={<WaiterHome />} />
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
