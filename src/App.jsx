import { useState, useEffect } from "react";
import { ROLES } from "./data";
import * as api from "./api";
import Dashboard from "./Dashboard";
import OrdersList from "./OrdersList";
import OrderDetail from "./OrderDetail";
import VendorsSection from "./VendorsSection";
import AfterSales from "./AfterSales";
import Reports from "./Reports";
import PastOrders from "./PastOrders";
import Settings from "./Settings";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "ti-home" },
  { id: "orders", label: "Orders", icon: "ti-file-text" },
  { id: "vendors", label: "Vendors", icon: "ti-users" },
  { id: "aftersales", label: "After-sales", icon: "ti-tool" },
  { id: "reports", label: "Reports", icon: "ti-chart-bar" },
  { id: "pastorders", label: "Past Orders", icon: "ti-archive" },
  { id: "settings", label: "Settings", icon: "ti-settings" },
];

const themeCSS = `
  :root[data-theme="light"] {
    --color-background-primary: #ffffff;
    --color-background-secondary: #f5f5f3;
    --color-background-tertiary: #eeede8;
    --color-background-info: #e6f1fb;
    --color-text-primary: #1a1a1a;
    --color-text-secondary: #666660;
    --color-text-info: #0c447c;
    --color-text-danger: #c0392b;
    --color-text-warning: #ba7517;
    --color-text-success: #27500a;
    --color-border-primary: #aaaaaa;
    --color-border-secondary: #cccccc;
    --color-border-tertiary: #e5e5e0;
    --color-border-danger: #f09595;
    --border-radius-md: 8px;
    --border-radius-lg: 12px;
    --font-sans: 'DM Sans', sans-serif;
  }
  :root[data-theme="dark"] {
    --color-background-primary: #1c1c1e;
    --color-background-secondary: #2c2c2e;
    --color-background-tertiary: #141414;
    --color-background-info: #0c2a45;
    --color-text-primary: #f0f0f0;
    --color-text-secondary: #999999;
    --color-text-info: #5baaf5;
    --color-text-danger: #e05c5c;
    --color-text-warning: #e0a040;
    --color-text-success: #6abf40;
    --color-border-primary: #555555;
    --color-border-secondary: #3a3a3c;
    --color-border-tertiary: #2a2a2c;
    --color-border-danger: #7a3030;
    --border-radius-md: 8px;
    --border-radius-lg: 12px;
    --font-sans: 'DM Sans', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
`;

function LoginScreen({ onLogin, darkMode, setDarkMode }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await api.login(username.trim().toLowerCase(), password);
      onLogin(user);
    } catch (err) {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      <button onClick={() => setDarkMode(d => !d)} style={{ position: "absolute", top: 20, right: 20, width: 36, height: 36, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
        <i className={darkMode ? "ti ti-sun" : "ti ti-moon"} />
      </button>
      <div style={{ backgroundColor: "#ffffff", color: "#1a1a1a", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>
            <span style={{ color: "#C0392B" }}>Indus</span>craft
          </div>
          <div style={{ fontSize: 13, color: "#666660", marginTop: 4 }}>Order Management System</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#666660", display: "block", marginBottom: 6 }}>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoFocus
              style={{ width: "100%", fontSize: 14, padding: "10px 12px", borderRadius: 9, fontFamily: "inherit", border: `0.5px solid ${error ? "#f09595" : "#cccccc"}`, background: "#f5f5f3", color: "#1a1a1a", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#666660", display: "block", marginBottom: 6 }}>Password</label>
            <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"
                style={{ width: "100%", fontSize: 14, padding: "10px 40px 10px 12px", borderRadius: 9, fontFamily: "inherit", border: `0.5px solid ${error ? "#f09595" : "#cccccc"}`, background: "#f5f5f3", color: "#1a1a1a", outline: "none" }} />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#666660", fontSize: 16 }}>
                <i className={showPassword ? "ti ti-eye-off" : "ti ti-eye"} />
              </button>
            </div>
          </div>
          {error && (
            <div style={{ fontSize: 12, color: "#C0392B", background: "#FCEBEB", padding: "8px 12px", borderRadius: 8, border: "0.5px solid #f09595" }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 13, marginRight: 5 }} />{error}
            </div>
          )}
          <button type="submit" disabled={loading || !username || !password}
            style={{ marginTop: 4, fontSize: 14, fontWeight: 500, padding: "11px 0", borderRadius: 9, border: "none", cursor: loading ? "wait" : "pointer", background: loading || !username || !password ? "#cccccc" : "#C0392B", color: loading || !username || !password ? "#666660" : "#ffffff", fontFamily: "inherit" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => api.getStoredUser());
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("induscraft-theme") === "dark");

  // Data state
  const [allOrders, setAllOrders] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [allServiceJobs, setAllServiceJobs] = useState([]);
  const [allReplacements, setAllReplacements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem("induscraft-theme", darkMode ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Load all data when user logs in
  useEffect(() => {
    if (!currentUser) return;
    loadAllData();
  }, [currentUser]);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const [orders, vendors, jobs, replacements] = await Promise.all([
        api.fetchAllOrders(), // fetch all including archived for Past Orders page
        api.fetchVendors(),
        api.fetchServiceJobs(),
        api.fetchReplacements(),
      ]);
      setAllOrders(orders);
      setAllVendors(vendors);
      setAllServiceJobs(jobs);
      setAllReplacements(replacements);
    } catch (err) {
      setError("Failed to load data. Please refresh.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const role = currentUser?.role || "admin";

  function navigate(p, orderId = null, vendorId = null) {
    setPage(p);
    if (orderId) setSelectedOrderId(orderId);
    if (vendorId) setSelectedVendorId(vendorId);
  }

  const selectedOrder = allOrders.find(o => o.id === selectedOrderId || o._id === selectedOrderId);

  async function handleUpdateOrder(updatedOrder) {
    try {
      // Use _id or original id to find the order for the API call
      const originalOrder = allOrders.find(o => o._id === updatedOrder._id);
      const originalId = originalOrder?.id || updatedOrder.id;
      const saved = await api.updateOrder(originalId, updatedOrder);
      setAllOrders(prev => prev.map(o => (o._id === saved._id) ? saved : o));
      // If order ID changed, update the selected order ID so the detail view stays open
      if (saved.id !== originalId) setSelectedOrderId(saved.id);
    } catch (err) {
      console.error("Update order error:", err);
      setAllOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    }
  }

  async function handleNewOrder(newOrder) {
    try {
      const saved = await api.createOrder(newOrder);
      setAllOrders(prev => [saved, ...prev]);
      navigate("orders", saved.id);
    } catch (err) {
      console.error("Create order error:", err);
      // Fallback: add locally
      setAllOrders(prev => [newOrder, ...prev]);
      navigate("orders", newOrder.id);
    }
  }

  async function handleAddVendor(vendor) {
    try {
      const saved = await api.createVendor(vendor);
      setAllVendors(prev => [...prev, saved]);
    } catch (err) {
      setAllVendors(prev => [...prev, vendor]);
    }
  }

  async function handleAddVendors(vendors) {
    try {
      const saved = await api.importVendors(vendors);
      setAllVendors(prev => [...prev, ...saved]);
    } catch (err) {
      setAllVendors(prev => [...prev, ...vendors]);
    }
  }

  function handleLogout() {
    api.logout();
    setCurrentUser(null);
    setAllOrders([]);
    setAllVendors([]);
    setAllServiceJobs([]);
    setAllReplacements([]);
    setPage("dashboard");
    setSelectedOrderId(null);
    setSelectedVendorId(null);
  }

  return (
    <div data-theme={darkMode ? "dark" : "light"} style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{themeCSS}</style>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {!currentUser ? (
        <LoginScreen onLogin={user => { setCurrentUser(user); }} darkMode={darkMode} setDarkMode={setDarkMode} />
      ) : (
        <>
          <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
                <span style={{ color: "#C0392B" }}>Indus</span>craft <span style={{ color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 13 }}>OMS</span>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {NAV.map(n => (
                  <button key={n.id} onClick={() => navigate(n.id)} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: page === n.id ? "var(--color-background-secondary)" : "transparent", color: page === n.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: page === n.id ? 500 : 400, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                    <i className={`ti ${n.icon}`} style={{ fontSize: 14 }} />{n.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loading && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Loading...</div>}
              <button onClick={() => setDarkMode(d => !d)} style={{ width: 32, height: 32, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontFamily: "inherit" }}>
                <i className={darkMode ? "ti ti-sun" : "ti ti-moon"} />
              </button>
              <div style={{ fontSize: 12, padding: "5px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 }}>
                <i className="ti ti-shield" style={{ fontSize: 13 }} />{ROLES[role]?.label || "Admin"}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-background-info)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "var(--color-text-info)" }}>
                {currentUser.initials}
              </div>
              <button onClick={handleLogout} title="Sign out" style={{ width: 32, height: 32, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontFamily: "inherit" }}>
                <i className="ti ti-logout" />
              </button>
            </div>
          </nav>

          {error && (
            <div style={{ background: "#FCEBEB", borderBottom: "0.5px solid #F09595", padding: "10px 24px", fontSize: 13, color: "#791F1F", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {error}
              <button onClick={loadAllData} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
            </div>
          )}

          <main style={{ padding: "20px 24px" }}>
            {page === "dashboard" && <Dashboard orders={allOrders} role={role} onOrderClick={(id) => navigate("orders", id)} />}
            {page === "orders" && !selectedOrderId && (
              <OrdersList orders={allOrders} vendors={allVendors} role={role}
                onOrderClick={(id) => navigate("orders", id)}
                onNewOrder={handleNewOrder} />
            )}
            {page === "orders" && selectedOrderId && selectedOrder && (
              <OrderDetail order={selectedOrder} role={role} vendors={allVendors}
                onBack={() => setSelectedOrderId(null)}
                onUpdate={handleUpdateOrder}
                onVendorClick={(vid) => navigate("vendors", null, vid)}
                currentUser={currentUser} />
            )}
            {page === "vendors" && (
              <VendorsSection vendors={allVendors} orders={allOrders}
                selectedVendorId={selectedVendorId}
                onVendorSelect={setSelectedVendorId}
                onOrderClick={(id) => navigate("orders", id)}
                role={role}
                onAddVendor={handleAddVendor}
                onAddVendors={handleAddVendors} />
            )}
            {page === "aftersales" && (
              <AfterSales serviceJobs={allServiceJobs} replacements={allReplacements}
                orders={allOrders} role={role}
                onOrderClick={(id) => navigate("orders", id)} />
            )}
            {page === "reports" && <Reports orders={allOrders} role={role} />}
            {page === "pastorders" && <PastOrders orders={allOrders} role={role} onOrderClick={(id) => navigate("orders", id)} onUpdate={handleUpdateOrder} />}
            {page === "settings" && role === "admin" && <Settings />}
          </main>
        </>
      )}
    </div>
  );
}