import { useState, useEffect, useRef } from "react";
import { ROLES } from "./data";
import * as api from "./api";
import { OrderSaveQueue, computePatch } from "./orderSync";
import Dashboard from "./Dashboard";
import OrdersList from "./OrdersList";
import OrderDetail from "./OrderDetail";
import { VendorsSection, AfterSales, Reports } from "./Sections";
import PastOrders from "./PastOrders";
import Settings from "./Settings";
import Pipeline from "./Pipeline";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "ti-home" },
  { id: "orders", label: "Orders", icon: "ti-file-text" },
  { id: "vendors", label: "Vendors", icon: "ti-users" },
  { id: "aftersales", label: "After-sales", icon: "ti-tool" },
  { id: "reports", label: "Reports", icon: "ti-chart-bar" },
  { id: "pastorders", label: "Past Orders", icon: "ti-archive" },
  { id: "pipeline", label: "Pipeline", icon: "ti-chart-dots" },
  { id: "settings", label: "Settings", icon: "ti-settings" },
];

// Reports is temporarily taken down while it is being fixed.
// To re-release: set this to true (nothing else needs to change).
const REPORTS_ENABLED = false;

const themeCSS = `
  :root {
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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
`;

function LoginScreen({ onLogin }) {
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
      setError(err && err.status === 401 ? "Incorrect username or password." : ((err && err.message) || "Could not sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>

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
  const [prefillOrder, setPrefillOrder] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => api.getStoredUser());

  // Data state
  // allOrders is NOT a source of truth. It is what the screen shows: the last
  // server-confirmed copy of every order, plus any change that is currently being
  // saved. The save queue (orderSync.js) owns it — if a save fails, the change is
  // taken back off the screen and held for Retry/Discard instead of being shown as
  // saved.
  const [allOrders, setAllOrders] = useState([]);
  const [saveStatus, setSaveStatus] = useState({ saving: 0, retrying: false, held: 0, heldOrderIds: [], heldLabels: [], error: null });
  const [serverSlow, setServerSlow] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [toast, setToast] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [allVendors, setAllVendors] = useState([]);
  const [allServiceJobs, setAllServiceJobs] = useState([]);
  const [allReplacements, setAllReplacements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const queueRef = useRef(null);
  if (!queueRef.current) {
    queueRef.current = new OrderSaveQueue({
      send: async (urlId, payload) => {
        try {
          return await api.updateOrder(urlId, payload);
        } catch (e) {
          if (e && e.auth) setSessionExpired(true);
          throw e;
        }
      },
      onChange: ({ orders, status }) => { setAllOrders(orders); setSaveStatus(status); },
    });
  }
  const queue = queueRef.current;
  const creatingRef = useRef(new Set());

  // "Server is waking up" signal from api.js
  useEffect(() => api.onServerSlow(setServerSlow), []);

  // Brief "All changes saved" confirmation after pending saves finish
  const prevSaving = useRef(0);
  useEffect(() => {
    if (prevSaving.current > 0 && saveStatus.saving === 0 && saveStatus.held === 0) {
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 2500);
      prevSaving.current = saveStatus.saving;
      return () => clearTimeout(t);
    }
    prevSaving.current = saveStatus.saving;
  }, [saveStatus.saving, saveStatus.held]);

  // Warn before closing the tab while something is unsaved
  useEffect(() => {
    if (saveStatus.saving === 0 && saveStatus.held === 0) return;
    const warn = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveStatus.saving, saveStatus.held]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(t => (t === message ? null : t)), 7000);
  }

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
      queue.setServerOrders(orders);
      setAllVendors(vendors);
      setAllServiceJobs(jobs);
      setAllReplacements(replacements);
    } catch (err) {
      if (err && err.auth) setSessionExpired(true);
      else setError("Failed to load data: " + ((err && err.message) || "unknown error") + " Please retry.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const role = currentUser?.role || "admin";

  function navigate(p, orderId = null, vendorId = null) {
    setPage(p);
    if (orderId) {
      const match = allOrders.find(o => o.id === orderId || o._id === orderId);
      setSelectedOrderId(match ? match._id : orderId);
    }
    if (vendorId) setSelectedVendorId(vendorId);
  }

  const selectedOrder = allOrders.find(o => o._id === selectedOrderId || o.id === selectedOrderId);

  // ── ORDER EDITS ────────────────────────────────────────────
  // `arg` is either a full updated order object (what most call sites build), or a
  // function (currentOrder) => updatedOrder. The function form is used for things that
  // finish later (photo uploads) so they always build from the LATEST order rather
  // than a snapshot taken minutes ago. The optional `_editLogField` on the result is
  // the short label recorded in the order's edit history ("Address", "Stage advanced"…).
  //
  // Returns { accepted, saved }. `accepted` is false only when this order already has
  // an unsaved change waiting on Retry/Discard — the edit is refused (and nothing is
  // silently dropped). `saved` resolves true/false when the save finishes.
  function handleUpdateOrder(arg, forKey) {
    const key = (typeof arg !== "function" && arg && arg._id) || forKey;
    const base = key ? queue.display(key) : undefined;
    if (!base) return { accepted: false, saved: Promise.resolve(false) };
    const next = typeof arg === "function" ? arg(base) : arg;
    const result = queue.enqueue(key, computePatch(base, next));
    if (result.blocked) {
      showToast("This order has a change that hasn't been saved. Press Retry or Discard in the red bar at the top before making more changes.");
    }
    return result;
  }

  async function handleDeleteOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId || o._id === orderId);
    try {
      await api.deleteOrder(order ? order.id : orderId);
      if (order) queue.removeOrder(order._id);
      setSelectedOrderId(null);
      navigate("orders", null);
    } catch (err) {
      console.error("Delete order error:", err);
      throw err; // let the caller show an error to the user
    }
  }

  // Creating an order either succeeds on the server or throws — it is never added
  // "locally" as a pretend success. The form stays open (with the user's data) on error.
  async function handleNewOrder(newOrder) {
    if (creatingRef.current.has(newOrder.id)) {
      throw new Error("This order is already being created — please wait a moment.");
    }
    creatingRef.current.add(newOrder.id);
    try {
      let saved;
      try {
        saved = await api.createOrder(newOrder);
      } catch (err) {
        if (/E11000|duplicate key|already exists/i.test((err && err.message) || "")) {
          // Either someone else just took this ID, or our own earlier attempt actually
          // went through and only the reply was lost. Check which.
          const existing = await api.fetchOrder(newOrder.id).catch(() => null);
          const mine = existing && existing._id
            && String(existing.createdBy) === String(currentUser && currentUser.id)
            && existing.customer && existing.customer.name === newOrder.customer.name
            && existing.value === newOrder.value;
          if (mine) {
            saved = existing;
          } else {
            const e = new Error(`Order ID ${newOrder.id} was just taken by another order.`);
            e.code = "DUPLICATE_ID";
            throw e;
          }
        } else {
          throw err;
        }
      }
      if (!saved || !saved._id) throw new Error("The server did not confirm the new order. Please try again.");
      queue.upsertServer(saved, { prepend: true });
      navigate("orders", saved._id);
      return saved;
    } finally {
      creatingRef.current.delete(newOrder.id);
    }
  }

  // Vendors: the vendor only appears once the server has saved it. (It used to be added
  // locally on failure with a made-up id; assigning that vendor to an order then made
  // the order itself unsaveable.)
  async function handleAddVendor(vendor) {
    try {
      const { id, orders, onTimeRate, flags, totalBilled, ...toSave } = vendor; // drop UI-only placeholder fields
      const saved = await api.createVendor(toSave);
      setAllVendors(prev => [...prev, saved]);
      return saved;
    } catch (err) {
      showToast(`Vendor "${vendor.name}" was NOT saved: ${(err && err.message) || "unknown error"}. Please add it again.`);
      return null;
    }
  }

  async function handleAddVendors(vendors) {
    try {
      const cleaned = vendors.map(({ id, orders, onTimeRate, flags, totalBilled, ...rest }) => rest);
      const saved = await api.importVendors(cleaned);
      setAllVendors(prev => [...prev, ...saved]);
      return saved;
    } catch (err) {
      showToast(`Vendor import was NOT saved: ${(err && err.message) || "unknown error"}. Please try the import again.`);
      return null;
    }
  }

  function handleLogout() {
    if ((saveStatus.saving > 0 || saveStatus.held > 0) &&
        !window.confirm("You have changes that have not been saved. They will be lost if you sign out. Sign out anyway?")) {
      return;
    }
    api.logout();
    setCurrentUser(null);
    setSessionExpired(false);
    queue.reset();
    setAllVendors([]);
    setAllServiceJobs([]);
    setAllReplacements([]);
    setPage("dashboard");
    setSelectedOrderId(null);
    setSelectedVendorId(null);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{themeCSS}</style>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {!currentUser ? (
        <LoginScreen onLogin={user => { setCurrentUser(user); }} />
      ) : (
        <>
          <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 52, borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.3px" }}>
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 400, fontSize: 13 }}>Operations</span> <span style={{ color: "#C0392B", fontWeight: 600 }}>— Induscraft</span>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {NAV.filter(n => {
                  if (n.id === "reports" && !REPORTS_ENABLED) return false;
                  if (role === "admin") return true;
                  if (role === "sales") return ["dashboard", "orders", "pipeline", "pastorders"].includes(n.id);
                  if (role === "qc") return ["dashboard", "orders"].includes(n.id);
                  if (role === "accountant") return ["dashboard", "orders", "reports", "pastorders"].includes(n.id);
                  return ["dashboard", "orders"].includes(n.id);
                }).map(n => (
                  <button key={n.id} onClick={() => navigate(n.id)} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: page === n.id ? "var(--color-background-secondary)" : "transparent", color: page === n.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: page === n.id ? 500 : 400, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                    <i className={`ti ${n.icon}`} style={{ fontSize: 14 }} />{n.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {loading && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Loading...</div>}

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

          {/* ── SAVE / CONNECTION STATUS ───────────────────────────────
              Everything here exists so that "did it save?" always has an honest,
              visible answer. */}
          <div style={{ position: "sticky", top: 52, zIndex: 90 }}>
            {sessionExpired && (
              <div style={{ background: "#FCEBEB", borderBottom: "0.5px solid #F09595", padding: "10px 24px", fontSize: 13, color: "#791F1F", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span><strong>Your session has expired.</strong> Sign in again to keep working.{(saveStatus.saving > 0 || saveStatus.held > 0) ? " Changes that were not saved will be lost." : ""}</span>
                <button onClick={handleLogout} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Sign in again</button>
              </div>
            )}
            {saveStatus.held > 0 && (
              <div style={{ background: "#FCEBEB", borderBottom: "0.5px solid #F09595", padding: "10px 24px", fontSize: 13, color: "#791F1F", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span>
                  <strong>{saveStatus.held} change{saveStatus.held > 1 ? "s" : ""} NOT saved</strong>
                  {saveStatus.heldOrderIds.length > 0 ? ` on ${saveStatus.heldOrderIds.join(", ")}` : ""}
                  {saveStatus.heldLabels.length > 0 ? ` (${saveStatus.heldLabels.join(", ")})` : ""}
                  {saveStatus.error ? ` — ${saveStatus.error}` : ""}
                </span>
                <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => queue.retryHeld()} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Retry</button>
                  <button onClick={() => { if (window.confirm("Discard the unsaved change(s)? What you typed will be lost.")) queue.discardHeld(); }} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "transparent", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Discard</button>
                </span>
              </div>
            )}
            {saveStatus.held === 0 && saveStatus.retrying && (
              <div style={{ background: "#FAEEDA", borderBottom: "0.5px solid #E8C98A", padding: "8px 24px", fontSize: 12, color: "#633806" }}>
                Connection problem — still trying to save. Please keep this page open.
              </div>
            )}
            {saveStatus.held === 0 && !saveStatus.retrying && serverSlow && (
              <div style={{ background: "#FAEEDA", borderBottom: "0.5px solid #E8C98A", padding: "8px 24px", fontSize: 12, color: "#633806" }}>
                The server is waking up — this can take up to a minute. Please keep this page open and don't click again.
              </div>
            )}
            {saveStatus.held === 0 && !saveStatus.retrying && !serverSlow && saveStatus.saving > 0 && (
              <div style={{ background: "var(--color-background-info)", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "6px 24px", fontSize: 12, color: "var(--color-text-info)" }}>
                Saving…
              </div>
            )}
            {saveStatus.held === 0 && saveStatus.saving === 0 && savedFlash && (
              <div style={{ background: "#EAF3DE", borderBottom: "0.5px solid #C0DD97", padding: "6px 24px", fontSize: 12, color: "#27500A" }}>
                ✓ All changes saved
              </div>
            )}
            {toast && (
              <div style={{ background: "#FCEBEB", borderBottom: "0.5px solid #F09595", padding: "8px 24px", fontSize: 12, color: "#791F1F", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span>{toast}</span>
                <button onClick={() => setToast(null)} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 7, border: "0.5px solid #F09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
              </div>
            )}
          </div>

          <main style={{ padding: "20px 24px" }}>
            {page === "dashboard" && <Dashboard orders={allOrders} role={role} onOrderClick={(id) => navigate("orders", id)} />}
            {page === "orders" && !selectedOrderId && (
              <OrdersList orders={allOrders} vendors={allVendors} role={role}
                onOrderClick={(id) => navigate("orders", id)}
                onNewOrder={handleNewOrder} prefill={prefillOrder} onPrefillUsed={() => setPrefillOrder(null)} currentUser={currentUser} />
            )}
            {page === "orders" && selectedOrderId && selectedOrder && (
              <OrderDetail order={selectedOrder} role={role} vendors={allVendors}
                onBack={() => setSelectedOrderId(null)}
                onUpdate={arg => handleUpdateOrder(arg, selectedOrder._id)}
                onDelete={handleDeleteOrder}
                onVendorClick={(vid) => navigate("vendors", null, vid)}
                onVendorCreated={v => setAllVendors(prev => [...prev, v])}
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
            {page === "reports" && (REPORTS_ENABLED
              ? <Reports orders={allOrders} role={role} />
              : (
                <div style={{ maxWidth: 420, margin: "80px auto", textAlign: "center" }}>
                  <i className="ti ti-tool" style={{ fontSize: 32, color: "var(--color-text-secondary)" }} />
                  <div style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)", margin: "12px 0 6px" }}>Reports temporarily unavailable</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>We're fixing this section and will bring it back soon.</div>
                  <button onClick={() => navigate("dashboard")} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" }}>Back to Dashboard</button>
                </div>
              ))}
            {page === "pastorders" && <PastOrders orders={allOrders} role={role} onOrderClick={(id) => navigate("orders", id)} onUpdate={arg => handleUpdateOrder(arg)} />}
            {page === "settings" && role === "admin" && <Settings currentUser={currentUser} />}
            {page === "pipeline" && (role === "admin" || role === "sales") && <Pipeline currentUser={currentUser} role={role} onCreateOrder={(prefill) => { setPrefillOrder(prefill); navigate("orders", null); }} />}
          </main>
        </>
      )}
    </div>
  );
}