import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import OrderCreate from "./pages/OrderCreate"; // ✅ import OrderCreate
import "./App.css";

// Small wrapper for logout route
function Logout({ onLogout }) {
  onLogout();
  return <Navigate to="/" replace />;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("access"));

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        {!isLoggedIn ? (
          <Route path="/*" element={<Login onLogin={handleLogin} />} />
        ) : (
          <>
            <Route path="/customers" element={<Customers />} />
            <Route path="/customer/:customerId" element={<CustomerDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/create/:customerId" element={<OrderCreate />} /> {/* ✅ new route */}
            <Route path="/orders/:orderId" element={<OrderDetails />} />
            <Route path="/logout" element={<Logout onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/customers" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
