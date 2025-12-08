import { BrowserRouter, Routes, Route } from "react-router-dom";

// HOME
import Home from "../pages/home/Home";

// WAITER
import WaiterLogin from "../pages/waiter/WaiterLogin";
import WaiterHome from "../pages/waiter/WaiterHome";
import WaiterOrderCreate from "../pages/waiter/WaiterOrderCreate";

// KITCHEN
import KitchenDashboard from "../pages/kitchen/KitchenDashboard";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* WAITER */}
        <Route path="/waiter" element={<WaiterLogin />} />
        <Route path="/waiter/home" element={<WaiterHome />} />
        <Route path="/waiter/create" element={<WaiterOrderCreate />} />

        {/* KITCHEN */}
        <Route path="/kitchen" element={<KitchenDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
