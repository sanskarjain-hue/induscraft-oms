import { useState, useRef } from "react";
import { Badge, Avatar, Btn, Card, SectionTitle, StatCard, formatCurrency } from "./ui";
import { STAGES } from "./data";

// ─── VENDORS ────────────────────────────────────────────────
export function VendorsSection({ vendors, orders, selectedVendorId, onVendorSelect, onOrderClick, role, onAddVendor, onAddVendors }) {
  const [search, setSearch] = useState("");
  const [perfFilter, setPerfFilter] = useState("All");
  const [showNewForm, setShowNewForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", phone: "", location: "", email: "" });
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const fileRef = useRef();

  function handleNewVendorSave() {
    if (!newVendor.name.trim() || !newVendor.phone.trim()) return;
    const initials = newVendor.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const colors = ["purple", "teal", "coral", "blue"];
    onAddVendor({
      id: "v" + Date.now(),
      name: newVendor.name.trim(),
      initials,
      color: colors[Math.floor(Math.random() * colors.length)],
      phone: newVendor.phone.trim(),
      location: newVendor.location.trim(),
      email: newVendor.email.trim(),
      orders: 0, onTimeRate: 100, flags: 0, totalBilled: 0,
    });
    setNewVendor({ name: "", phone: "", location: "", email: "" });
    setShowNewForm(false);
  }

  function handleFileUpload(e) {
    setImportError("");
    setImportPreview([]);
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setImportError("File must have a header row and at least one data row."); return; }
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
        const nameIdx = headers.findIndex(h => h.includes("name"));
        const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("contact"));
        const locationIdx = headers.findIndex(h => h.includes("location") || h.includes("city") || h.includes("place"));
        const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
        if (nameIdx === -1) { setImportError("Could not find a 'Name' column. Please check your column headers."); return; }
        const rows = lines.slice(1).map(line => {
          const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          return {
            name: cols[nameIdx] || "",
            phone: phoneIdx >= 0 ? cols[phoneIdx] || "" : "",
            location: locationIdx >= 0 ? cols[locationIdx] || "" : "",
            email: emailIdx >= 0 ? cols[emailIdx] || "" : "",
          };
        }).filter(r => r.name);
        setImportPreview(rows);
      } catch (err) {
        setImportError("Could not read file. Please save it as CSV (comma separated) and try again.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function confirmImport() {
    const colors = ["purple", "teal", "coral", "blue"];
    const newVendors = importPreview.map((r, i) => ({
      id: "v" + Date.now() + i,
      name: r.name,
      initials: r.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
      color: colors[i % colors.length],
      phone: r.phone,
      location: r.location,
      email: r.email,
      orders: 0, onTimeRate: 100, flags: 0, totalBilled: 0,
    }));
    onAddVendors(newVendors);
    setImportPreview([]);
    setShowImport(false);
  }

  function perf(v) {
    if (v.onTimeRate >= 85 && v.flags <= 3) return "Good";
    if (v.onTimeRate < 70 || v.flags > 8) return "Poor";
    return "Average";
  }

  const filtered = vendors.filter(v => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (perfFilter !== "All" && perf(v) !== perfFilter) return false;
    return true;
  });

  const selected = vendors.find(v => v.id === selectedVendorId);

  const perfColors = { Good: { bg: "#EAF3DE", fg: "#27500A" }, Average: { bg: "#FAEEDA", fg: "#633806" }, Poor: { bg: "#FCEBEB", fg: "#791F1F" } };

  const vendorOrders = selected
    ? orders.filter(o => o.items.some(i => i.vendorId === selected.id))
        .flatMap(o => o.items.filter(i => i.vendorId === selected.id).map(i => ({ orderId: o.id, item: i })))
    : [];

  const vendorFlags = selected
    ? orders.flatMap(o => o.items.filter(i => i.vendorId === selected.id).flatMap(i => i.flags.map(f => ({ ...f, orderId: o.id, itemName: i.name }))))
    : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Vendors</div>
        {role === "admin" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => { setShowImport(true); setShowNewForm(false); }}><i className="ti ti-upload" style={{ fontSize: 13 }} /> Import CSV</Btn>
            <Btn onClick={() => { setShowNewForm(true); setShowImport(false); }}><i className="ti ti-plus" style={{ fontSize: 13 }} /> Add vendor</Btn>
          </div>
        )}
      </div>

      {/* New vendor form */}
      {showNewForm && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, color: "var(--color-text-primary)" }}>New vendor</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {[["Name *", "name", "Vendor or company name"], ["Phone *", "phone", "+91 XXXXX XXXXX"], ["Location", "location", "City"], ["Email", "email", "email@example.com"]].map(([label, key, ph]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>{label}</div>
                <input value={newVendor[key]} onChange={e => setNewVendor(v => ({ ...v, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNewForm(false)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={handleNewVendorSave} disabled={!newVendor.name || !newVendor.phone} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: !newVendor.name || !newVendor.phone ? "var(--color-border-secondary)" : "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Save vendor</button>
          </div>
        </div>
      )}

      {/* Import CSV form */}
      {showImport && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, color: "var(--color-text-primary)" }}>Import vendors from CSV</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            Your CSV file should have columns: <strong>Name, Phone, Location, Email</strong>. Save your Excel file as CSV before uploading.
          </div>
          <div onClick={() => fileRef.current.click()} style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer", background: "var(--color-background-secondary)", marginBottom: 12 }}>
            <i className="ti ti-upload" style={{ fontSize: 22, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Click to upload CSV file</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
          {importError && <div style={{ fontSize: 12, color: "var(--color-text-danger)", padding: "8px 12px", background: "#FCEBEB", borderRadius: 8, marginBottom: 10 }}>{importError}</div>}
          {importPreview.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>{importPreview.length} vendors found — review before importing:</div>
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                      {["Name", "Phone", "Location", "Email"].map(h => <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {[r.name, r.phone, r.location, r.email].map((v, j) => <td key={j} style={{ padding: "7px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)" }}>{v || "—"}</td>)}
                      </tr>
                    ))}
                    {importPreview.length > 5 && <tr><td colSpan={4} style={{ padding: "7px 10px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>...and {importPreview.length - 5} more</td></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setImportPreview([]); setShowImport(false); }} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={confirmImport} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Import {importPreview.length} vendors</button>
              </div>
            </div>
          )}
          {importPreview.length === 0 && !importError && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowImport(false)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", flex: 1, fontFamily: "inherit" }} />
        {["All", "Good", "Average", "Poor"].map(p => (
          <button key={p} onClick={() => setPerfFilter(p)} style={{
            fontSize: 12, padding: "5px 11px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
            background: perfFilter === p ? "var(--color-background-secondary)" : "transparent",
            color: perfFilter === p ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: perfFilter === p ? 500 : 400, cursor: "pointer", fontFamily: "inherit"
          }}>{p}</button>
        ))}
      </div>

      <SectionTitle>All vendors ({filtered.length})</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {filtered.map(v => {
          const p = perf(v);
          const pc = perfColors[p];
          const colorMap = { purple: "#EEEDFE", teal: "#E1F5EE", coral: "#FAECE7", blue: "#E6F1FB" };
          const fgMap = { purple: "#3C3489", teal: "#085041", coral: "#712B13", blue: "#0C447C" };
          return (
            <div key={v.id} onClick={() => onVendorSelect(v.id === selectedVendorId ? null : v.id)}
              style={{ background: "var(--color-background-primary)", border: `0.5px solid ${v.id === selectedVendorId ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-secondary)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = v.id === selectedVendorId ? "var(--color-border-primary)" : "var(--color-border-tertiary)"}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: colorMap[v.color] || "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: fgMap[v.color] || "#0C447C", flexShrink: 0 }}>{v.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{v.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{v.phone} &middot; {v.location} &middot; {v.orders} orders</div>
              </div>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                {[["On-time rate", `${v.onTimeRate}%`, v.onTimeRate >= 85 ? "#27500A" : v.onTimeRate < 70 ? "#791F1F" : "#633806"],
                  ["Problem flags", v.flags, v.flags > 8 ? "#791F1F" : v.flags > 3 ? "#633806" : "#27500A"],
                  ["Total billed", formatCurrency(v.totalBilled), "var(--color-text-primary)"]].map(([l, val, color]) => (
                  <div key={l} style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color }}>{val}</div>
                  </div>
                ))}
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 500, background: pc.bg, color: pc.fg }}>{p}</span>
                <i className="ti ti-chevron-right" style={{ fontSize: 16, color: "var(--color-text-secondary)" }} />
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <>
          <div style={{ height: 0.5, background: "var(--color-border-tertiary)", margin: "4px 0 20px" }} />
          <SectionTitle>Vendor profile — {selected.name}</SectionTitle>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 500, color: "#3C3489" }}>{selected.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
                  <i className="ti ti-phone" style={{ fontSize: 12, marginRight: 4 }} />{selected.phone} &middot;
                  <i className="ti ti-map-pin" style={{ fontSize: 12, margin: "0 4px" }} />{selected.location} &middot;
                  <i className="ti ti-mail" style={{ fontSize: 12, margin: "0 4px" }} />{selected.email}
                </div>
              </div>
              {role === "admin" && <Btn style={{ fontSize: 11, padding: "5px 10px" }}><i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit</Btn>}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                <StatCard label="Total orders" value={selected.orders} />
                <StatCard label="On-time rate" value={`${selected.onTimeRate}%`} valueColor={selected.onTimeRate >= 85 ? "#27500A" : selected.onTimeRate < 70 ? "#791F1F" : "#633806"} />
                <StatCard label="Problem flags" value={selected.flags} valueColor={selected.flags > 8 ? "#791F1F" : selected.flags > 3 ? "#633806" : "#27500A"} />
                <StatCard label="Total billed" value={formatCurrency(selected.totalBilled)} />
              </div>

              <SectionTitle>Order history</SectionTitle>
              <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                      {["Order ID", "Item supplied", "Cost", "Committed", "Actual", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", fontSize: 10, color: "var(--color-text-secondary)", padding: "6px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vendorOrders.map(({ orderId, item }) => {
                      const isDelayed = item.actualDate && item.actualDate > item.committedDate;
                      return (
                        <tr key={`${orderId}-${item.id}`} onClick={() => onOrderClick(orderId)} style={{ cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-info)", fontWeight: 500 }}>{orderId}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{item.name}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{formatCurrency(item.vendorCost)}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{item.committedDate}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: isDelayed ? "#791F1F" : item.actualDate ? "#27500A" : "var(--color-text-secondary)" }}>{item.actualDate || "—"}</td>
                          <td style={{ padding: "8px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 7, fontWeight: 500, background: isDelayed ? "#FAEEDA" : item.actualDate ? "#EAF3DE" : "#F1EFE8", color: isDelayed ? "#633806" : item.actualDate ? "#27500A" : "#444441" }}>
                              {isDelayed ? "Delayed" : item.actualDate ? "On time" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {vendorOrders.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No orders in current data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <SectionTitle>Problem flag history</SectionTitle>
              {vendorFlags.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "8px 0" }}>No problem flags recorded.</div>
              ) : vendorFlags.map((f, idx) => (
                <div key={idx} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: idx < vendorFlags.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 7, background: "#FCEBEB", color: "#791F1F", flexShrink: 0 }}>{f.type}</span>
                  <div>
                    <div style={{ fontSize: 12 }}>{f.desc} — <span style={{ color: "var(--color-text-info)", cursor: "pointer", fontWeight: 500 }} onClick={() => onOrderClick(f.orderId)}>{f.orderId}</span></div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{f.stage} &middot; {f.date} {f.photos > 0 && `· ${f.photos} photos`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AFTER-SALES ────────────────────────────────────────────
export function AfterSales({ serviceJobs: initialJobs, replacements: initialReplacements, orders = [], role, onOrderClick }) {
  const [subTab, setSubTab] = useState("service");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [allJobs, setAllJobs] = useState(initialJobs);
  const [allReplacements, setAllReplacements] = useState(initialReplacements);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showRepForm, setShowRepForm] = useState(false);

  // New service job form state
  const [newJob, setNewJob] = useState({ customer: "", orderRef: "", problem: "", assignedTo: "", appointment: "", chargeable: "" });

  // New replacement form state
  const [newRep, setNewRep] = useState({
    customer: "", originalOrderId: "", originalItem: "", originalDelivered: "",
    defect: "", newOrderId: "", expectedDelivery: "", collectionDate: "", assignedTo: ""
  });

  const statusColors = { Open: { bg: "#FAEEDA", fg: "#633806" }, "In progress": { bg: "#E6F1FB", fg: "#0C447C" }, Resolved: { bg: "#EAF3DE", fg: "#27500A" } };

  const filteredJobs = allJobs.filter(j => {
    if (statusFilter !== "All" && j.status !== statusFilter) return false;
    if (search && !j.customer.toLowerCase().includes(search.toLowerCase()) && !j.orderRef.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const open = allJobs.filter(j => j.status === "Open").length;
  const inProg = allJobs.filter(j => j.status === "In progress").length;
  const resolved = allJobs.filter(j => j.status === "Resolved").length;

  function saveJob() {
    if (!newJob.customer || !newJob.problem) return;
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    setAllJobs(prev => [{
      id: "sj" + Date.now(),
      date: today,
      customer: newJob.customer,
      orderRef: newJob.orderRef,
      problem: newJob.problem,
      assignedTo: newJob.assignedTo,
      appointment: newJob.appointment,
      status: "Open",
      chargeable: newJob.chargeable ? parseInt(newJob.chargeable) : null,
    }, ...prev]);
    setNewJob({ customer: "", orderRef: "", problem: "", assignedTo: "", appointment: "", chargeable: "" });
    setShowJobForm(false);
  }

  function updateJobStatus(id, status) {
    setAllJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  }

  function saveReplacement() {
    if (!newRep.customer || !newRep.originalOrderId) return;
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    setAllReplacements(prev => [{
      id: "REP-" + String(prev.length + 1).padStart(4, "0"),
      status: "In progress",
      customer: newRep.customer,
      originalOrderId: newRep.originalOrderId,
      originalItem: newRep.originalItem,
      originalDelivered: newRep.originalDelivered,
      defect: newRep.defect,
      photos: 0,
      newOrderId: newRep.newOrderId,
      newStage: "Looking for vendor",
      expectedDelivery: newRep.expectedDelivery,
      oldItemStatus: "Awaiting pickup",
      collectionDate: newRep.collectionDate,
      assignedTo: newRep.assignedTo,
      loggedDate: today,
    }, ...prev]);
    setNewRep({ customer: "", originalOrderId: "", originalItem: "", originalDelivered: "", defect: "", newOrderId: "", expectedDelivery: "", collectionDate: "", assignedTo: "" });
    setShowRepForm(false);
  }

  function lookupForJob(idOrName) {
    if (!idOrName.trim()) return;
    const match = orders.find(o =>
      o.id.toLowerCase() === idOrName.trim().toLowerCase() ||
      o.customer.name.toLowerCase().includes(idOrName.trim().toLowerCase())
    );
    if (match) {
      setNewJob(j => ({
        ...j,
        customer: match.customer.name,
        orderRef: match.id,
      }));
    }
  }

  function lookupOrder(idOrName) {
    if (!idOrName.trim()) return;
    const match = orders.find(o =>
      o.id.toLowerCase() === idOrName.trim().toLowerCase() ||
      o.customer.name.toLowerCase().includes(idOrName.trim().toLowerCase())
    );
    if (match) {
      const itemNames = match.items.map(i => i.name).join(", ");
      const delivered = match.items.reduce((latest, i) => i.currentDelivery > latest ? i.currentDelivery : latest, "");
      setNewRep(r => ({
        ...r,
        customer: match.customer.name,
        originalOrderId: match.id,
        originalItem: itemNames,
        originalDelivered: delivered,
      }));
    }
  }

  const FIELD_STYLE = { width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" };
  const LABEL_STYLE = { fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 5 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>After-sales</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => { setShowJobForm(true); setShowRepForm(false); setSubTab("service"); }}><i className="ti ti-plus" style={{ fontSize: 13 }} /> New service job</Btn>
          <Btn onClick={() => { setShowRepForm(true); setShowJobForm(false); setSubTab("replacement"); }}><i className="ti ti-refresh" style={{ fontSize: 13 }} /> New replacement</Btn>
        </div>
      </div>

      {/* New service job form */}
      {showJobForm && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>New service job</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 4 }} />
              Type order ID or customer name and tab out to auto-fill
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={LABEL_STYLE}>Customer name *</label>
              <input type="text" value={newJob.customer}
                onChange={e => setNewJob(j => ({ ...j, customer: e.target.value }))}
                onBlur={e => lookupForJob(e.target.value)}
                placeholder="Full name — will auto-fill order ref"
                style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Order reference</label>
              <input type="text" value={newJob.orderRef}
                onChange={e => setNewJob(j => ({ ...j, orderRef: e.target.value }))}
                onBlur={e => lookupForJob(e.target.value)}
                placeholder="e.g. BL-0084 — will auto-fill customer"
                style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Problem *</label>
              <input type="text" value={newJob.problem}
                onChange={e => setNewJob(j => ({ ...j, problem: e.target.value }))}
                placeholder="Describe the issue"
                style={FIELD_STYLE} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Assigned to", "assignedTo", "text", "Name"], ["Appointment date", "appointment", "date", ""], ["Chargeable amount (₹)", "chargeable", "number", "Leave blank if free"]].map(([label, key, type, ph]) => (
              <div key={key}>
                <label style={LABEL_STYLE}>{label}</label>
                <input type={type} value={newJob[key]} onChange={e => setNewJob(j => ({ ...j, [key]: e.target.value }))} placeholder={ph} style={FIELD_STYLE} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowJobForm(false)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveJob} disabled={!newJob.customer || !newJob.problem} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: !newJob.customer || !newJob.problem ? "var(--color-border-secondary)" : "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Save job</button>
          </div>
        </div>
      )}

      {/* New replacement form */}
      {showRepForm && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14, color: "var(--color-text-primary)" }}>New replacement order</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Original order details</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
              <i className="ti ti-info-circle" style={{ fontSize: 12, marginRight: 4 }} />
              Type order ID or customer name and tab out to auto-fill
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["Customer name *", "customer", "text", "Full name — will auto-fill from existing orders"], ["Original order ID *", "originalOrderId", "text", "e.g. BL-0084 — will auto-fill details"]].map(([label, key, type, ph]) => (
              <div key={key}>
                <label style={LABEL_STYLE}>{label}</label>
                <input type={type} value={newRep[key]}
                  onChange={e => setNewRep(r => ({ ...r, [key]: e.target.value }))}
                  onBlur={e => lookupOrder(e.target.value)}
                  placeholder={ph} style={FIELD_STYLE} />
              </div>
            ))}
            <div>
              <label style={LABEL_STYLE}>Item with defect</label>
              <input type="text" value={newRep.originalItem} onChange={e => setNewRep(r => ({ ...r, originalItem: e.target.value }))} placeholder="Auto-filled or type manually" style={FIELD_STYLE} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={LABEL_STYLE}>Original delivery date</label>
              <input type="date" value={newRep.originalDelivered} onChange={e => setNewRep(r => ({ ...r, originalDelivered: e.target.value }))} style={FIELD_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Defect description</label>
              <input type="text" value={newRep.defect} onChange={e => setNewRep(r => ({ ...r, defect: e.target.value }))} placeholder="Describe the defect" style={FIELD_STYLE} />
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10 }}>Replacement & collection</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[["New order ID", "newOrderId", "text", "e.g. BL-0090"], ["Expected delivery", "expectedDelivery", "date", ""], ["Collection date", "collectionDate", "date", ""]].map(([label, key, type, ph]) => (
              <div key={key}>
                <label style={LABEL_STYLE}>{label}</label>
                <input type={type} value={newRep[key]} onChange={e => setNewRep(r => ({ ...r, [key]: e.target.value }))} placeholder={ph} style={FIELD_STYLE} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_STYLE}>Assigned to</label>
            <input type="text" value={newRep.assignedTo} onChange={e => setNewRep(r => ({ ...r, assignedTo: e.target.value }))} placeholder="Person handling collection/delivery" style={{ ...FIELD_STYLE, maxWidth: 240 }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowRepForm(false)} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveReplacement} disabled={!newRep.customer || !newRep.originalOrderId} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: !newRep.customer || !newRep.originalOrderId ? "var(--color-border-secondary)" : "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Create replacement</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[{ id: "service", label: "Service jobs", icon: "ti-tool" }, { id: "replacement", label: "Replacement orders", icon: "ti-refresh" }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)",
            background: subTab === t.id ? "var(--color-background-secondary)" : "var(--color-background-primary)",
            color: subTab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: subTab === t.id ? 500 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit"
          }}><i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />{t.label}</button>
        ))}
      </div>

      {subTab === "service" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            <StatCard label="Open" value={open} valueColor="#633806" />
            <StatCard label="In progress" value={inProg} valueColor="var(--color-text-info)" />
            <StatCard label="Resolved this month" value={resolved} valueColor="#27500A" />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or order ID..."
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", flex: 1, fontFamily: "inherit" }} />
            {["All", "Open", "In progress", "Resolved"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                fontSize: 12, padding: "5px 11px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)",
                background: statusFilter === s ? "var(--color-background-secondary)" : "transparent",
                color: statusFilter === s ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontWeight: statusFilter === s ? 500 : 400, cursor: "pointer", fontFamily: "inherit"
              }}>{s}</button>
            ))}
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Date", "Customer", "Order ref", "Problem", "Assigned to", "Appointment", "Status", "Chargeable"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, color: "var(--color-text-secondary)", padding: "8px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No service jobs found</td></tr>
                )}
                {filteredJobs.map(j => {
                  const sc = statusColors[j.status] || statusColors.Open;
                  return (
                    <tr key={j.id} onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{j.date}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{j.customer}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-info)", cursor: "pointer" }} onClick={() => j.orderRef && onOrderClick(j.orderRef)}>{j.orderRef || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", fontSize: 12 }}>{j.problem}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{j.assignedTo || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{j.appointment || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        {role === "admin" ? (
                          <select value={j.status} onChange={e => updateJobStatus(j.id, e.target.value)}
                            style={{ fontSize: 11, padding: "3px 7px", borderRadius: 7, fontWeight: 500, background: sc.bg, color: sc.fg, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                            {["Open", "In progress", "Resolved"].map(s => <option key={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 500, background: sc.bg, color: sc.fg }}>{j.status}</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: j.chargeable ? 500 : 400, color: j.chargeable ? "#27500A" : "var(--color-text-secondary)" }}>
                        {j.chargeable ? `₹${j.chargeable}` : "No"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === "replacement" && (
        <div>
          {allReplacements.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No replacement orders yet.</div>}
          {allReplacements.map(r => (
            <div key={r.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-info)" }}>{r.id}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 500, background: "#FCEBEB", color: "#791F1F" }}>Replacement</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 500, background: r.status === "Completed" ? "#EAF3DE" : "#E6F1FB", color: r.status === "Completed" ? "#27500A" : "#0C447C" }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{r.customer} &middot; Original order {r.originalOrderId} &middot; Logged {r.loggedDate}</div>
                </div>
                <Btn style={{ fontSize: 11, padding: "5px 10px" }}><i className="ti ti-external-link" style={{ fontSize: 12 }} /> View full</Btn>
              </div>
              <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Original order</div>
                  <div style={{ fontSize: 13, marginBottom: 3 }}>{r.originalItem}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Delivered {r.originalDelivered}</div>
                  <div style={{ fontSize: 12, color: "#791F1F", marginBottom: 8 }}>{r.defect}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {Array.from({ length: r.photos }).map((_, i) => (
                      <div key={i} style={{ width: 44, height: 44, borderRadius: 8, background: "var(--color-background-tertiary)", border: "0.5px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className="ti ti-photo" style={{ fontSize: 16, color: "var(--color-text-secondary)" }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Replacement order</div>
                  <div style={{ fontSize: 13, marginBottom: 3 }}>New order: <span style={{ color: "var(--color-text-info)", fontWeight: 500 }}>{r.newOrderId}</span></div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Expected: {r.expectedDelivery}</div>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 500, background: "#E6F1FB", color: "#0C447C" }}>{r.newStage}</span>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Old item status</div>
                  <div style={{ fontSize: 13, marginBottom: 3 }}>Collection: {r.collectionDate}</div>
                  <div style={{ fontSize: 12, marginBottom: 3 }}>Assigned: {r.assignedTo}</div>
                  <div style={{ fontSize: 12, color: r.status === "Completed" ? "#27500A" : "#633806" }}>{r.oldItemStatus}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── REPORTS ────────────────────────────────────────────────
export function Reports({ orders, role }) {
  const totalOrders = orders.length;
  const completed = orders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) === 8).length;
  const totalRevenue = orders.reduce((s, o) => s + o.payments.reduce((ps, p) => ps + p.amount, 0), 0);

  const reportCards = [
    { title: "Purchase orders (PO)", desc: "Vendor POs per order — includes order sheet, line items, cost and delivery date.", icon: "ti-file-text", color: { bg: "#EEEDFE", fg: "#3C3489" }, exportType: "PDF", filters: ["All channels", "All vendors"] },
    { title: "Customer details", desc: "Customer contact list — name, phone, address, channel, order count.", icon: "ti-users", color: { bg: "#E1F5EE", fg: "#085041" }, exportType: "Excel", filters: ["All channels", "All time"] },
    { title: "Packed orders", desc: "Items at packed stage ready to dispatch. Filter by channel for store-wise lists.", icon: "ti-package", color: { bg: "#EAF3DE", fg: "#27500A" }, exportType: "Excel", filters: ["All channels", "All time"] },
    { title: "Vendor performance", desc: "On-time rate, delays, problem flags and spend per vendor over a date range.", icon: "ti-alert-triangle", color: { bg: "#FAEEDA", fg: "#633806" }, exportType: "Excel", filters: ["All vendors", "All time"] },
    { title: "Delay & overdue report", desc: "All delayed and overdue orders with delay duration, stage and responsible vendor.", icon: "ti-clock", color: { bg: "#FAECE7", fg: "#712B13" }, exportType: "Excel", filters: ["All channels", "All time"] },
    { title: "Channel-wise summary", desc: "Orders, revenue collected and completion rate broken down by channel.", icon: "ti-chart-bar", color: { bg: "#E6F1FB", fg: "#0C447C" }, exportType: "Excel", filters: ["All channels", "This month"] },
  ];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Reports</div>

      <SectionTitle>This month at a glance</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label="Orders created" value={totalOrders} sub="↑ 4 vs last month" />
        <StatCard label="Orders completed" value={completed} sub="↑ 2 vs last month" />
        <StatCard label="On-time delivery" value="78%" valueColor="#633806" sub="↓ 5% vs last month" />
        <StatCard label="Revenue collected" value={formatCurrency(totalRevenue)} sub="↑ ₹1.8L vs last month" />
      </div>

      <div style={{ height: 0.5, background: "var(--color-border-tertiary)", margin: "0 0 20px" }} />
      <SectionTitle>Export reports</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
        {reportCards.map(rc => (
          <div key={rc.title} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: rc.color.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={`ti ${rc.icon}`} style={{ fontSize: 18, color: rc.color.fg }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{rc.title}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{rc.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {rc.filters.map(f => (
                  <select key={f} defaultValue={f} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
                    <option>{f}</option>
                  </select>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input type="date" style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
                <input type="date" style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
              </div>
              <button style={{
                fontSize: 12, padding: "8px 14px", borderRadius: 8, cursor: "pointer", width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: "inherit",
                background: rc.exportType === "PDF" ? "#FCEBEB" : "#EAF3DE",
                border: `0.5px solid ${rc.exportType === "PDF" ? "#F09595" : "#97C459"}`,
                color: rc.exportType === "PDF" ? "#791F1F" : "#27500A"
              }}>
                <i className="ti ti-download" style={{ fontSize: 13 }} /> Export as {rc.exportType}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
