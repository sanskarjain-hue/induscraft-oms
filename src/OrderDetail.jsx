import { useState } from "react";
import PrintView from "./PrintView";
import CostApproval from "./CostApproval";
import { Badge, channelVariant, stageVariant, Btn, Card, SectionTitle, StatCard, formatCurrency, TimerPill } from "./ui";
import { STAGES } from "./data";
import { uploadFile } from "./api";

// FIX: orders saved before the item.id schema fix have items with no `id` field
// (it was silently stripped by Mongoose strict mode). This helper falls back to
// Mongoose's own `_id` so all item matching works for both old and new orders.
function itemKey(item) {
  return item.id || item._id;
}

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", borderRadius: "12px 12px 0 0" }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onSelect(t)} style={{
          fontSize: 13, padding: "10px 16px", cursor: "pointer",
          color: active === t ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          fontWeight: active === t ? 500 : 400,
          borderBottom: active === t ? "2px solid var(--color-text-primary)" : "2px solid transparent",
          border: "none", background: "transparent", marginBottom: -0.5, fontFamily: "inherit"
        }}>{t}</button>
      ))}
    </div>
  );
}

// ── EDIT LOG ──────────────────────────────────────────────
// Whole-order log (not per-field): each entry says who changed something and when,
// with a short label of what kind of change it was. Newest first.
function formatLogTime(d) {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " at " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function EditLogPanel({ order }) {
  const log = order.editLog || [];
  const [expanded, setExpanded] = useState(false);
  if (log.length === 0) return null;

  const sorted = [...log].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  const latest = sorted[0];
  const rest = sorted.slice(1);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: rest.length > 0 && expanded ? 10 : 0 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
          <i className="ti ti-history" style={{ fontSize: 13, marginRight: 6 }} />
          Last edited by <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{latest.changedBy}</strong>
          {latest.field ? ` — ${latest.field}` : ""} &middot; {formatLogTime(latest.changedAt)}
        </div>
        {rest.length > 0 && (
          <button onClick={() => setExpanded(e => !e)} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            {expanded ? "Hide history" : `+${rest.length} more`}
          </button>
        )}
      </div>
      {expanded && rest.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rest.map((entry, i) => (
            <div key={i} style={{ fontSize: 11, color: "var(--color-text-secondary)", paddingLeft: 19 }}>
              <strong style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{entry.changedBy}</strong>
              {entry.field ? ` — ${entry.field}` : ""} &middot; {formatLogTime(entry.changedAt)}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function OrderInfoTab({ order, role, onUpdate, currentUser }) {
  const [editDispatch, setEditDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState(order.dispatchDetails || { partner: "", driver: "", driverPhone: "" });

  const maxStageIdx = Math.max(...order.items.map(i => i.stageIndex));
  const allFlags = order.items.flatMap(i => i.flags.map(f => ({ ...f, itemName: i.name })));
  const isDispatched = order.items.some(i => i.stageIndex >= 6);

  function saveDispatch() {
    onUpdate({ ...order, dispatchDetails: dispatchForm, _editLogField: "Dispatch details" });
    setEditDispatch(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <EditLogPanel order={order} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionTitle>Customer</SectionTitle>
          {[["Name", order.customer.name], ["Phone", order.customer.phone]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: 200 }}>{v}</span>
            </div>
          ))}
          <div style={{ padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Address</div>
            <textarea
              defaultValue={order.customer.address || ""}
              onBlur={e => {
                if (e.target.value === (order.customer.address || "")) return;
                onUpdate({ ...order, customer: { ...order.customer, address: e.target.value }, _editLogField: "Address" });
              }}
              placeholder="Click to add address..."
              style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", fontFamily: "inherit", minHeight: 56 }}
            />
          </div>
        </Card>
        <Card>
          <SectionTitle>Order summary</SectionTitle>
          {[
            ["Order value", formatCurrency(order.value)],
            ["Advance paid", formatCurrency(order.advance)],
            ["Balance due", formatCurrency(order.value - order.advance)],
            ["Salesperson", order.salesperson],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Delivery date confirmation — Admin confirms salesperson recommended date */}
      <Card style={{ border: order.deliveryConfirmed ? "0.5px solid #97C459" : "0.5px solid #EF9F27" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Delivery date</SectionTitle>
          {order.deliveryConfirmed ? (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: "#EAF3DE", color: "#27500A", fontWeight: 500 }}>
              <i className="ti ti-check" style={{ fontSize: 11, marginRight: 3 }} />Confirmed
            </span>
          ) : (
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: "#FAEEDA", color: "#633806", fontWeight: 500 }}>
              Awaiting confirmation
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Recommended by salesperson</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{order.items[0]?.originalDelivery || "—"}</div>
          </div>
          {role === "admin" && !order.deliveryConfirmed && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Confirm final date</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" defaultValue={order.items[0]?.originalDelivery || ""}
                  id="confirm-delivery-input"
                  style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
                <button onClick={() => {
                  const val = document.getElementById("confirm-delivery-input").value;
                  const updated = {
                    ...order,
                    deliveryConfirmed: true,
                    items: order.items.map(i => ({ ...i, originalDelivery: val, currentDelivery: val })),
                    _editLogField: "Delivery date confirmed",
                  };
                  onUpdate(updated);
                }} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Confirm
                </button>
              </div>
            </div>
          )}
          {order.deliveryConfirmed && (
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>Confirmed delivery date</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#27500A" }}>{order.items[0]?.originalDelivery || "—"}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Pipeline */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SectionTitle style={{ marginBottom: 0 }}>Pipeline</SectionTitle>
          <div style={{ display: "flex", gap: 16 }}>
            {order.items.map(item => (
              <div key={itemKey(item)} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{item.name.substring(0, 20)}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Due: {item.originalDelivery}</span>
                  {item.originalDelivery !== item.currentDelivery && (
                    <span style={{ fontSize: 11, color: "#791F1F", fontWeight: 500 }}>→ {item.currentDelivery}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                <div style={{ flex: 1, height: 2, background: i === 0 ? "transparent" : i <= maxStageIdx ? "#639922" : "var(--color-border-tertiary)" }} />
                <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: i < maxStageIdx ? "#639922" : i === maxStageIdx ? "#FAEEDA" : "var(--color-background-primary)", border: `2px solid ${i < maxStageIdx ? "#639922" : i === maxStageIdx ? "#BA7517" : "var(--color-border-tertiary)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i < maxStageIdx && <i className="ti ti-check" style={{ fontSize: 9, color: "white" }} />}
                </div>
                <div style={{ flex: 1, height: 2, background: i === STAGES.length - 1 ? "transparent" : i < maxStageIdx ? "#639922" : "var(--color-border-tertiary)" }} />
              </div>
              <div style={{ fontSize: 9, color: i === maxStageIdx ? "#854F0B" : i < maxStageIdx ? "#3B6D11" : "var(--color-text-secondary)", textAlign: "center", marginTop: 5, maxWidth: 58, lineHeight: 1.3, fontWeight: i === maxStageIdx ? 500 : 400 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Dispatch details — shown when dispatched, editable by admin */}
      {isDispatched && (
        <Card style={{ border: "0.5px solid var(--color-border-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionTitle style={{ marginBottom: 0 }}><i className="ti ti-truck" style={{ fontSize: 13, marginRight: 6 }} />Dispatch details</SectionTitle>
            {role === "admin" && !editDispatch && (
              <button onClick={() => setEditDispatch(true)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                {order.dispatchDetails ? "Edit" : "Add details"}
              </button>
            )}
          </div>
          {editDispatch ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Transport partner", "partner", "e.g. Shree Transport"], ["Driver name", "driver", "Driver's name"], ["Driver phone", "driverPhone", "+91 XXXXX XXXXX"]].map(([label, key, ph]) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>{label}</div>
                  <input value={dispatchForm[key]} onChange={e => setDispatchForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                    style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setEditDispatch(false)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={saveDispatch} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
              </div>
            </div>
          ) : order.dispatchDetails ? (
            <div>
              {[["Transport partner", order.dispatchDetails.partner], ["Driver", order.dispatchDetails.driver], ["Driver phone", order.dispatchDetails.driverPhone]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v || "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>No dispatch details added yet.</div>
          )}
        </Card>
      )}

      {/* Problem flags */}
      {allFlags.length > 0 && (
        <Card style={{ border: "0.5px solid #F09595" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#A32D2D", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 13, marginRight: 4 }} />Problem flags ({allFlags.length})
            </div>
            <Btn variant="danger" style={{ fontSize: 11, padding: "4px 10px" }}><i className="ti ti-plus" style={{ fontSize: 12 }} /> Add flag</Btn>
          </div>
          {allFlags.map((f, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: idx < allFlags.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 7, background: "#FCEBEB", color: "#791F1F", flexShrink: 0 }}>{f.type}</span>
              <div>
                <div style={{ fontSize: 12 }}>{f.desc} — <span style={{ color: "var(--color-text-secondary)" }}>{f.itemName}</span></div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{f.stage} &middot; {f.date} {f.photos > 0 && `· ${f.photos} photos`}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionTitle>Order sheet</SectionTitle>
          {order.orderSheetFiles && order.orderSheetFiles.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {order.orderSheetFiles.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--color-background-secondary)", borderRadius: 8 }}>
                  <i className="ti ti-file" style={{ fontSize: 14, color: "var(--color-text-secondary)" }} />
                  <span style={{ fontSize: 12, flex: 1 }}>{f}</span>
                  <i className="ti ti-download" style={{ fontSize: 14, color: "var(--color-text-secondary)", cursor: "pointer" }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 8, padding: 16, textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)" }}>
              <i className="ti ti-upload" style={{ fontSize: 20, marginBottom: 6, display: "block" }} />
              Drop order sheet here
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle>Notes</SectionTitle>
          <textarea defaultValue={order.notes}
            onBlur={e => {
              if (e.target.value === (order.notes || "")) return;
              onUpdate({ ...order, notes: e.target.value, _editLogField: "Notes" });
            }}
            style={{ width: "100%", fontSize: 12, padding: 10, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", fontFamily: "inherit", minHeight: 80 }} />
        </Card>
      </div>
    </div>
  );
}

// ── STAGE PHOTO STRIP ─────────────────────────────────────
function StagePhotoStrip({ photos, label, canUpload, onUpload }) {
  function handleFiles(e) {
    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const updated = [...photos, { name: file.name, type: file.type, data: ev.target.result }];
        onUpload(updated);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  if (!canUpload && photos.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {photos.map((photo, pi) => {
          const src = photo.url || photo.data;
          return (
            <div key={pi} style={{ position: "relative", width: 64, height: 64 }}>
              <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--color-border-secondary)" }}>
                {src
                  ? <img src={src} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-photo" style={{ fontSize: 18, color: "var(--color-text-secondary)" }} /></div>
                }
              </div>
              {src && (
                <a onClick={e => {
                  if (src.startsWith("http")) return; // normal download for cloudinary
                  e.preventDefault();
                  fetch(src).then(r => r.blob()).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = photo.name || "photo";
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  });
                }} href={src} download={photo.name || "photo"} title="Download"
                  style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: 4, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                  <i className="ti ti-download" style={{ fontSize: 11, color: "white" }} />
                </a>
              )}
            </div>
          );
        })}
        {canUpload && (
          <label style={{ width: 64, height: 64, borderRadius: 8, border: "0.5px dashed var(--color-border-secondary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 3, flexShrink: 0 }}>
            <i className="ti ti-upload" style={{ fontSize: 16, color: "var(--color-text-secondary)" }} />
            <div style={{ fontSize: 9, color: "var(--color-text-secondary)" }}>Upload</div>
            <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
          </label>
        )}
      </div>
    </div>
  );
}

// ── VENDOR ASSIGN ─────────────────────────────────────────
function VendorAssign({ item, order, vendors, onUpdate, onVendorCreated }) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: "", phone: "", contact: "", location: "Jodhpur" });
  const [saving, setSaving] = useState(false);

  const assigned = (vendors || []).find(v => v.id === item.vendorId || v._id === item.vendorId);
  const filtered = (vendors || []).filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone || "").includes(search) ||
    (v.contact || "").toLowerCase().includes(search.toLowerCase())
  );

  function assignVendor(vendorId) {
    const key = itemKey(item);
    const updated = { ...order, items: order.items.map(i => itemKey(i) === key ? { ...i, vendorId, stageIndex: Math.max(i.stageIndex, 1) } : i), _editLogField: "Vendor assignment" };
    onUpdate(updated);
    setShowDropdown(false);
    setSearch("");
  }

  function unassign() {
    const ukey = itemKey(item);
    const updated = { ...order, items: order.items.map(i => itemKey(i) === ukey ? { ...i, vendorId: null, vendorCost: 0, committedDate: "" } : i), _editLogField: "Vendor assignment" };
    onUpdate(updated);
  }

  async function createAndAssign() {
    if (!newVendor.name.trim()) return;
    setSaving(true);
    try {
      const created = await import("./api").then(m => m.createVendor({
        name: newVendor.name,
        phone: newVendor.phone,
        contact: newVendor.contact,
        location: newVendor.location,
        initials: newVendor.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        color: "teal",
      }));
      if (onVendorCreated) onVendorCreated(created);
      assignVendor(created._id || created.id);
      setShowNew(false);
      setNewVendor({ name: "", phone: "", contact: "", location: "Jodhpur" });
    } catch (err) {
      alert("Failed to create vendor: " + err.message);
    } finally { setSaving(false); }
  }

  const INPUT = { width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" };

  return (
    <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Vendor</div>

      {assigned ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{assigned.name}</div>
            {(assigned.phone || assigned.contact) && (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {assigned.contact && <span>{assigned.contact}</span>}
                {assigned.contact && assigned.phone && <span> &middot; </span>}
                {assigned.phone && <span>{assigned.phone}</span>}
              </div>
            )}
          </div>
          <button onClick={unassign} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Change</button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Search input */}
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); setShowNew(false); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search or add vendor..."
            style={{ ...INPUT, marginBottom: showDropdown ? 0 : 0 }}
          />

          {/* Dropdown */}
          {showDropdown && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", marginTop: 4, overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
              {filtered.length > 0 && (
                <div>
                  {filtered.map(v => (
                    <div key={v.id || v._id} onClick={() => assignVendor(v.id || v._id)}
                      style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                        {v.contact && <span>{v.contact}</span>}
                        {v.contact && v.phone && <span> &middot; </span>}
                        {v.phone && <span>{v.phone}</span>}
                        {v.location && <span> &middot; {v.location}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {filtered.length === 0 && search && (
                <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-secondary)" }}>No matching vendors</div>
              )}
              {/* Add new vendor option */}
              <div onClick={() => { setShowNew(true); setShowDropdown(false); }}
                style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, borderTop: filtered.length > 0 ? "0.5px solid var(--color-border-tertiary)" : "none" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <i className="ti ti-plus" style={{ fontSize: 13, color: "#C0392B" }} />
                <span style={{ fontSize: 13, color: "#C0392B", fontWeight: 500 }}>Add new vendor</span>
                {search && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>"{search}"</span>}
              </div>
            </div>
          )}

          {/* Click outside to close */}
          {showDropdown && <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowDropdown(false)} />}
        </div>
      )}

      {/* New vendor form */}
      {showNew && (
        <div style={{ marginTop: 10, padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)" }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: "var(--color-text-primary)" }}>New vendor details</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Company name *</div>
              <input value={newVendor.name} onChange={e => setNewVendor(v => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Sharma Wood Works" style={INPUT} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Phone number</div>
                <input value={newVendor.phone} onChange={e => setNewVendor(v => ({ ...v, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" style={INPUT} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Person of correspondence</div>
                <input value={newVendor.contact} onChange={e => setNewVendor(v => ({ ...v, contact: e.target.value }))}
                  placeholder="Contact person name" style={INPUT} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Location</div>
              <input value={newVendor.location} onChange={e => setNewVendor(v => ({ ...v, location: e.target.value }))}
                placeholder="e.g. Jodhpur" style={INPUT} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={() => setShowNew(false)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={createAndAssign} disabled={saving || !newVendor.name.trim()}
              style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "Save & assign"}
            </button>
          </div>
        </div>
      )}

      {/* Committed date and vendor cost — shown once assigned */}
      {assigned && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5 }}>Committed delivery</div>
            <input type="date" defaultValue={item.committedDate || ""}
              onBlur={e => {
                if (e.target.value === (item.committedDate || "")) return;
                const ckey = itemKey(item); onUpdate({ ...order, items: order.items.map(i => itemKey(i) === ckey ? { ...i, committedDate: e.target.value } : i), _editLogField: "Committed delivery date" });
              }}
              style={{ width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5 }}>Vendor cost (₹)</div>
            <input type="number" defaultValue={item.vendorCost || ""}
              onBlur={e => {
                const parsed = parseFloat(e.target.value) || 0;
                if (parsed === (item.vendorCost || 0)) return;
                const vkey = itemKey(item); onUpdate({ ...order, items: order.items.map(i => itemKey(i) === vkey ? { ...i, vendorCost: parsed } : i), _editLogField: "Vendor cost" });
              }}
              style={{ width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
          </div>
        </div>
      )}
    </div>
  );
}

function LineItemsTab({ order, role, vendors, onUpdate, onVendorCreated }) {
  // Salespeople (and admins) can update product images for an item at any time,
  // independent of which stage it's in. This logs an edit-log entry so it's clear
  // who changed the reference photos and when.
  //
  // Images go through Cloudinary (uploadFile), same as NewOrderForm — never store raw
  // base64 directly in the order document. Base64-in-MongoDB was the exact problem
  // behind the earlier image migration; storing it here again would silently
  // reintroduce it for every image edited after order creation.
  //
  // buildUpdated/buildReplaced take an explicit `base` order rather than closing over
  // the `order` prop. This matters across await boundaries (e.g. while a Cloudinary
  // upload is in flight): the component can re-render with a fresh `order` prop in
  // that window, and a closure over the original prop would silently overwrite
  // whatever changed in between when the second save fires.
  function buildAdded(base, key, newImages) {
    return {
      ...base,
      items: base.items.map(i => itemKey(i) === key ? { ...i, images: [...(i.images || []), ...newImages] } : i),
      _editLogField: "Product images",
    };
  }

  function buildReplacedAt(base, key, idx, newImage) {
    return {
      ...base,
      items: base.items.map(i => {
        if (itemKey(i) !== key) return i;
        const imgs = [...(i.images || [])];
        imgs[idx] = newImage;
        return { ...i, images: imgs };
      }),
      _editLogField: "Product images",
    };
  }

  function removeItemImage(key, imgIdx) {
    const updated = {
      ...order,
      items: order.items.map(i => itemKey(i) === key ? { ...i, images: (i.images || []).filter((_, idx) => idx !== imgIdx) } : i),
      _editLogField: "Product images",
    };
    onUpdate(updated);
  }

  async function handleFileSelect(key, fileList) {
    for (const file of Array.from(fileList)) {
      // Show an instant base64 preview while the real upload runs in the background,
      // then swap it for the Cloudinary URL once the upload resolves.
      const reader = new FileReader();
      reader.onload = async ev => {
        const previewImage = { name: file.name, type: file.type, data: ev.target.result, uploading: true };
        const item = order.items.find(i => itemKey(i) === key);
        const insertIdx = (item.images || []).length;

        // Build and save the preview-inserted order; remember exactly what we sent
        // so the follow-up save starts from that same state rather than re-reading
        // (possibly stale, possibly fresher-but-different) component props.
        const withPreview = buildAdded(order, key, [previewImage]);
        onUpdate(withPreview);

        try {
          const result = await uploadFile(file, "orders");
          const withFinal = buildReplacedAt(withPreview, key, insertIdx, { name: file.name, type: file.type, url: result.url, publicId: result.publicId });
          onUpdate(withFinal);
        } catch {
          // Upload failed — leave the base64 preview in place rather than losing the image.
          const withFallback = buildReplacedAt(withPreview, key, insertIdx, { name: file.name, type: file.type, data: ev.target.result });
          onUpdate(withFallback);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  const canEditImages = role === "admin" || role === "sales";

  return (
    <div>
      {order.items.map(item => {
        const key = itemKey(item);
        return (
        <div key={key} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--color-background-tertiary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
              {item.images && item.images.length > 0 && (item.images[0].url || item.images[0].data) ? (
                <img src={item.images[0].url || item.images[0].data} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <i className="ti ti-armchair" style={{ fontSize: 20, color: "var(--color-text-secondary)" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{item.productId} &middot; Qty: {item.qty}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{formatCurrency(item.price)}</div>
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {/* Specs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
              {[["Wood", item.wood], ["Wood colour", item.woodColour], ["Fabric code", item.fabricCode || "—"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: v === "—" ? 400 : 500, color: v === "—" ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Images — viewable always, editable any time by admin/sales (not gated by stage) */}
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Product images {item.images && item.images.length > 0 ? `(${item.images.length})` : ""}
                </div>
                {canEditImages && (
                  <label style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-upload" style={{ fontSize: 11 }} /> Update images
                    <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => { handleFileSelect(key, e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              {item.images && item.images.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.images.map((img, i) => {
                    const isImage = img.type && img.type.startsWith("image/");
                    const src = img.url || img.data;
                    return (
                      <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                        <div style={{ width: 72, height: 72, borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", overflow: "hidden", cursor: "pointer" }}
                          onClick={() => {
                            if (!src) return;
                            if (src.startsWith("http")) {
                              window.open(src, "_blank");
                            } else {
                              fetch(src).then(r => r.blob()).then(blob => {
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.target = "_blank";
                                a.click();
                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                              });
                            }
                          }}>
                          {isImage && src ? (
                            <img src={src} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: "var(--color-background-secondary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                              <i className="ti ti-file" style={{ fontSize: 20, color: "var(--color-text-secondary)" }} />
                              <div style={{ fontSize: 8, color: "var(--color-text-secondary)", textAlign: "center", padding: "0 4px" }}>{img.name}</div>
                            </div>
                          )}
                        </div>
                        {canEditImages && (
                          <button onClick={() => removeItemImage(key, i)} title="Remove image"
                            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#C0392B", border: "none", cursor: "pointer", color: "white", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="ti ti-x" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>No images uploaded yet.</div>
              )}
            </div>

            {/* Hardware */}
            {item.hardware && item.hardware.length > 0 && (
              <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>Hardware references</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {item.hardware.map(h => (
                    <div key={h} style={{ width: 52, height: 52, borderRadius: 8, background: "var(--color-background-tertiary)", border: "0.5px solid var(--color-border-secondary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, cursor: "pointer" }}>
                      <i className="ti ti-photo" style={{ fontSize: 16, color: "var(--color-text-secondary)" }} />
                      <div style={{ fontSize: 9, color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.2 }}>{h}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.remarks && (
              <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>Remarks</div>
                <div style={{ fontSize: 12 }}>{item.remarks}</div>
              </div>
            )}

            {/* Vendor assignment — Admin only */}
            {role === "admin" && (
              <VendorAssign
                item={item}
                order={order}
                vendors={vendors}
                onUpdate={onUpdate}
                onVendorCreated={onVendorCreated}
              />
            )}

            {/* Production status mini tracker */}
            <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Production status</div>
                <Badge variant={stageVariant(item.stageIndex)}>{STAGES[item.stageIndex]}</Badge>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {STAGES.map((s, i) => (
                  <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                      <div style={{ flex: 1, height: 2, background: i === 0 ? "transparent" : i <= item.stageIndex ? "#639922" : "var(--color-border-tertiary)" }} />
                      <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, background: i < item.stageIndex ? "#639922" : i === item.stageIndex ? "#FAEEDA" : "var(--color-background-primary)", border: `1.5px solid ${i < item.stageIndex ? "#639922" : i === item.stageIndex ? "#BA7517" : "var(--color-border-tertiary)"}` }} />
                      <div style={{ flex: 1, height: 2, background: i === STAGES.length - 1 ? "transparent" : i < item.stageIndex ? "#639922" : "var(--color-border-tertiary)" }} />
                    </div>
                    <div style={{ fontSize: 8, color: i === item.stageIndex ? "#854F0B" : i < item.stageIndex ? "#3B6D11" : "var(--color-text-secondary)", textAlign: "center", marginTop: 4, maxWidth: 52, lineHeight: 1.2 }}>{s.split(" ")[0]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );})}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, padding: "12px 16px", background: "var(--color-background-secondary)", borderRadius: 8 }}>
        <div><div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Items</div><div style={{ fontSize: 15, fontWeight: 500 }}>{order.items.length}</div></div>
        <div style={{ width: 1, background: "var(--color-border-tertiary)" }} />
        <div><div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Total order value</div><div style={{ fontSize: 15, fontWeight: 500 }}>{formatCurrency(order.value)}</div></div>
      </div>
    </div>
  );
}

function TrackerTab({ order, role, vendors, onUpdate, currentUser }) {
  const [delayModal, setDelayModal] = useState(null);
  const [qcState, setQcState] = useState({});

  function canAdvance(stageIndex) {
    if (role === "admin") return true;
    if (role === "sales" && stageIndex >= 7) return true;
    if (role === "qc" && stageIndex >= 4 && stageIndex <= 5) return true;
    return false;
  }

  function isResponsibleSalesperson(order) {
    if (role === "admin") return true;
    return currentUser?.name === order.salesperson;
  }

  function advanceItem(itemId, extraProps = {}) {
    const updated = {
      ...order,
      items: order.items.map(i => {
        if (i.id !== itemId) return i;
        const next = Math.min(i.stageIndex + 1, 8);
        let fp = { ...i.finishingProgress };
        if (i.stageIndex === 3) fp = Object.fromEntries(Object.keys(fp).map(k => [k, "done"]));
        return { ...i, stageIndex: next, finishingProgress: fp, ...extraProps };
      })
    };
    onUpdate(updated);
  }

  function advanceSubStep(itemId, stepName) {
    const updated = {
      ...order,
      items: order.items.map(i => {
        if (i.id !== itemId) return i;
        const fp = { ...i.finishingProgress };
        const keys = Object.keys(fp);
        fp[stepName] = "done";
        const idx = keys.indexOf(stepName);
        if (idx + 1 < keys.length && fp[keys[idx + 1]] !== "done") fp[keys[idx + 1]] = "active";
        return { ...i, finishingProgress: fp };
      })
    };
    onUpdate(updated);
  }

  function applyDelay(itemId, days) {
    const updated = {
      ...order,
      items: order.items.map(i => {
        if (i.id !== itemId) return i;
        const base = new Date();
        base.setDate(base.getDate() + parseInt(days));
        const newDate = base.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        return { ...i, currentDelivery: newDate };
      })
    };
    onUpdate(updated);
    setDelayModal(null);
  }

  function submitQC(itemId, status) {
    const notes = qcState[itemId]?.notes || "";
    if (status === "fail" && !notes.trim()) {
      alert("Please add a comment explaining why QC failed.");
      return;
    }
    advanceItem(itemId, { qcStatus: status, qcNotes: notes });
    setQcState(s => ({ ...s, [itemId]: { ...s[itemId], submitted: true } }));
  }

  return (
    <div>
      {delayModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, width: 360, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: "var(--color-text-primary)" }}>Log delay</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10 }}>How many days delayed?</div>
            <input type="number" min="1" defaultValue={5} id="delay-days-input"
              style={{ width: "100%", fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDelayModal(null)} style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => applyDelay(delayModal, document.getElementById("delay-days-input").value)}
                style={{ fontSize: 13, padding: "7px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit" }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {order.items.map(item => {
        const vendor = vendors.find(v => v.id === item.vendorId);
        const isDelayed = item.originalDelivery !== item.currentDelivery;
        const whatsappMsg = encodeURIComponent(`Dear ${order.customer.name}, your order ${order.id} has been slightly delayed. New expected delivery: ${item.currentDelivery}. We apologise for the inconvenience. — Induscraft`);
        const whatsappUrl = `https://wa.me/${order.customer.phone.replace(/\D/g, "")}?text=${whatsappMsg}`;
        const userCanAdvance = canAdvance(item.stageIndex) && item.stageIndex < 8;
        const canMessage = isResponsibleSalesperson(order);
        const localQC = qcState[item.id] || {};

        return (
          <div key={item.id} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.name}</div>
                {(role === "admin" || role === "qc") && (
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {vendor ? `${vendor.name} · ${vendor.phone}` : "No vendor assigned"}
                  </div>
                )}
              </div>
              <Badge variant={stageVariant(item.stageIndex)}>{STAGES[item.stageIndex]}</Badge>
              <TimerPill item={item} orderDate={order.date} />
            </div>

            {isDelayed && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "#FAEEDA", borderBottom: "0.5px solid #EF9F27" }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 16, color: "#854F0B" }} />
                <div style={{ fontSize: 12, color: "#633806", flex: 1 }}>Delayed — original {item.originalDelivery}, now expected {item.currentDelivery}</div>
                {canMessage && (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid #BA7517", background: "white", color: "#854F0B", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="ti ti-brand-whatsapp" style={{ fontSize: 13 }} /> Message customer
                  </a>
                )}
              </div>
            )}

            <div style={{ padding: 16 }}>
              {STAGES.map((stageName, i) => {
                const isDone = i < item.stageIndex;
                const isActive = i === item.stageIndex;
                return (
                  <div key={stageName} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: isDone ? "#639922" : isActive ? "#FAEEDA" : "var(--color-background-primary)", border: `2px solid ${isDone ? "#639922" : isActive ? "#BA7517" : "var(--color-border-tertiary)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isDone && <i className="ti ti-check" style={{ fontSize: 9, color: "white" }} />}
                      </div>
                      {i < STAGES.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: isDone ? "#639922" : "var(--color-border-tertiary)", margin: "3px 0" }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: isDone ? "#3B6D11" : isActive ? "#854F0B" : "var(--color-text-secondary)", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>{stageName}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {isActive && <TimerPill item={item} orderDate={order.date} />}
                          {isActive && userCanAdvance && stageName !== "QC" && stageName !== "Raw ready" && stageName !== "Delivered to warehouse" && (
                            <button onClick={() => advanceItem(item.id)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 7, border: "none", background: "#639922", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                              <i className="ti ti-arrow-right" style={{ fontSize: 12 }} /> Mark complete
                            </button>
                          )}
                          {isActive && userCanAdvance && stageName === "Raw ready" && item.rawPhotosApproved && (
                            <button onClick={() => advanceItem(item.id)} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 7, border: "none", background: "#639922", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                              <i className="ti ti-arrow-right" style={{ fontSize: 12 }} /> Proceed to finishing
                            </button>
                          )}
                          {isActive && userCanAdvance && stageName === "Raw ready" && !item.rawPhotosApproved && (
                            <span style={{ fontSize: 11, color: "#BA7517", fontStyle: "italic" }}>Awaiting raw photo approval</span>
                          )}
                          {isActive && role === "admin" && (
                            <button onClick={() => setDelayModal(item.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid #BA7517", background: "transparent", color: "#854F0B", cursor: "pointer", fontFamily: "inherit" }}>
                              Log delay
                            </button>
                          )}
                        </div>
                      </div>

                      {isDone && stageName === "QC" && item.qcStatus && (
                        <div style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, background: item.qcStatus === "pass" ? "#EAF3DE" : "#FCEBEB", color: item.qcStatus === "pass" ? "#27500A" : "#791F1F", marginTop: 4 }}>
                          QC {item.qcStatus === "pass" ? "Passed" : "Failed"}{item.qcNotes ? ` — ${item.qcNotes}` : ""}
                        </div>
                      )}
                      {isActive && stageName === "Raw ready" && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                            QC team must upload raw product photos. Salesperson approval required before polishing can begin.
                          </div>
                          {(role === "admin" || role === "qc") && (
                            <StagePhotoStrip
                              photos={item.rawPhotos || []}
                              label="Raw product photos"
                              canUpload={true}
                              onUpload={newPhotos => onUpdate({ ...order, items: order.items.map(i => i.id === item.id ? { ...i, rawPhotos: newPhotos } : i) })}
                            />
                          )}
                          {(item.rawPhotos || []).length > 0 && !item.rawPhotosApproved && (role === "admin" || role === "sales") && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                                Review the raw photos above and approve to allow polishing to begin.
                              </div>
                              <button onClick={() => {
                                const updated = { ...order, items: order.items.map(i => i.id === item.id ? { ...i, rawPhotosApproved: true } : i) };
                                onUpdate(updated);
                              }} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#639922", color: "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                                <i className="ti ti-check" style={{ fontSize: 13 }} /> Approve — proceed to finishing
                              </button>
                            </div>
                          )}
                          {item.rawPhotosApproved && (
                            <div style={{ fontSize: 12, color: "#27500A", marginTop: 6, fontWeight: 500 }}>
                              <i className="ti ti-check" style={{ fontSize: 13, marginRight: 4 }} />Raw photos approved — polishing can begin
                            </div>
                          )}
                        </div>
                      )}

                      {isDone && (
                        <div>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Completed</div>
                          {stageName === "Raw ready" && (item.rawPhotos || []).length > 0 && (
                            <StagePhotoStrip photos={item.rawPhotos} label="Raw product photos" canUpload={false} />
                          )}
                          {stageName === "Finishing" && (item.finishingPhotos || []).length > 0 && (
                            <StagePhotoStrip photos={item.finishingPhotos} label="In-progress photos" canUpload={false} />
                          )}
                          {stageName === "QC" && (item.qcPhotos || []).length > 0 && (
                            <StagePhotoStrip photos={item.qcPhotos} label="QC inspection photos" canUpload={false} />
                          )}
                        </div>
                      )}

                      {isActive && stageName === "Processing started" && vendor && (
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", padding: "8px 10px", borderRadius: 8, marginTop: 4 }}>
                          {vendor.name} &middot; Committed: {item.committedDate || "—"}
                        </div>
                      )}

                      {isActive && stageName === "Finishing" && (
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                          {item.finishingSteps.map(step => {
                            const status = item.finishingProgress[step] || "pending";
                            return (
                              <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: status === "done" ? "#639922" : status === "active" ? "#BA7517" : "transparent", border: `1.5px solid ${status === "done" ? "#639922" : status === "active" ? "#BA7517" : "var(--color-border-secondary)"}`, flexShrink: 0 }} />
                                <span style={{ color: status === "done" ? "#3B6D11" : status === "active" ? "#854F0B" : "var(--color-text-secondary)", fontWeight: status === "active" ? 500 : 400 }}>{step}</span>
                                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: "auto" }}>{status === "done" ? "Done" : status === "active" ? "In progress" : "Pending"}</span>
                                {status !== "done" && (role === "admin" || role === "qc") && (
                                  <button onClick={() => advanceSubStep(item.id, step)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, border: "0.5px solid #639922", background: "transparent", color: "#3B6D11", cursor: "pointer", fontFamily: "inherit" }}>Done</button>
                                )}
                              </div>
                            );
                          })}
                          <StagePhotoStrip
                            photos={item.finishingPhotos || []}
                            label="In-progress photos"
                            canUpload={role === "admin" || role === "qc"}
                            onUpload={newPhotos => onUpdate({ ...order, items: order.items.map(i => i.id === item.id ? { ...i, finishingPhotos: newPhotos } : i) })}
                          />
                        </div>
                      )}

                      {isActive && stageName === "QC" && (
                        <div style={{ marginTop: 8 }}>
                          {!localQC.submitted ? (
                            <>
                              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>QC notes</div>
                              <textarea
                                value={localQC.notes || ""}
                                onChange={e => setQcState(s => ({ ...s, [item.id]: { ...s[item.id], notes: e.target.value } }))}
                                placeholder="Describe findings, issues, or observations..."
                                style={{ width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", resize: "vertical", minHeight: 70, marginBottom: 10 }}
                              />
                              {(role === "admin" || role === "qc") && (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={() => submitQC(item.id, "pass")} style={{ flex: 1, fontSize: 12, padding: "8px", borderRadius: 8, border: "none", background: "#639922", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                    <i className="ti ti-check" style={{ fontSize: 14 }} /> Pass QC
                                  </button>
                                  <button onClick={() => submitQC(item.id, "fail")} style={{ flex: 1, fontSize: 12, padding: "8px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                    <i className="ti ti-x" style={{ fontSize: 14 }} /> Fail QC
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>QC submitted.</div>
                          )}

                          <StagePhotoStrip
                            photos={item.qcPhotos || []}
                            label="QC inspection photos"
                            canUpload={role === "admin" || role === "qc"}
                            onUpload={newPhotos => onUpdate({ ...order, items: order.items.map(i => i.id === item.id ? { ...i, qcPhotos: newPhotos } : i) })}
                          />
                        </div>
                      )}

                      {isActive && stageName === "Packed" && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>Number of packets for this item</div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input type="number" min="1" defaultValue={item.packetCount || ""}
                              placeholder="e.g. 3"
                              onBlur={e => {
                                const updated = { ...order, items: order.items.map(i => i.id === item.id ? { ...i, packetCount: parseInt(e.target.value) || 0 } : i) };
                                onUpdate(updated);
                              }}
                              style={{ width: 120, fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>packets</span>
                          </div>
                          {item.packetCount > 0 && (
                            <div style={{ fontSize: 12, color: "#27500A", marginTop: 6, fontWeight: 500 }}>
                              <i className="ti ti-package" style={{ fontSize: 12, marginRight: 4 }} />{item.packetCount} packets recorded
                            </div>
                          )}
                        </div>
                      )}

                      {isActive && stageName === "Delivered to warehouse" && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                            <i className="ti ti-clock" style={{ fontSize: 13, marginRight: 4 }} />
                            Item is at warehouse. Waiting for customer to confirm availability before delivery.
                          </div>
                          {(role === "admin" || role === "sales") && (
                            <button onClick={() => advanceItem(item.id)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#639922", color: "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                              <i className="ti ti-check" style={{ fontSize: 13 }} /> Customer confirmed — deliver now
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 16, padding: "10px 16px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
              <div><div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Original delivery</div><div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.originalDelivery}</div></div>
              <div style={{ width: 1, background: "var(--color-border-tertiary)" }} />
              <div><div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Current expected</div><div style={{ fontSize: 12, fontWeight: 500, color: isDelayed ? "#791F1F" : "var(--color-text-primary)" }}>{item.currentDelivery}{isDelayed && " (delayed)"}</div></div>
              {item.packetCount > 0 && (
                <>
                  <div style={{ width: 1, background: "var(--color-border-tertiary)" }} />
                  <div><div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>Packets</div><div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.packetCount}</div></div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VendorsTab({ order, vendors, role, onVendorClick }) {
  const totalVendorCost = order.items.reduce((s, i) => s + (i.vendorCost || 0), 0);
  return (
    <div>
      <SectionTitle>Vendor assignments</SectionTitle>
      {order.items.map(item => {
        const vendor = vendors.find(v => v.id === item.vendorId);
        const isDelayed = item.actualDate && item.actualDate > item.committedDate;
        return (
          <div key={itemKey(item)} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#3C3489" }}>{vendor?.initials || "?"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor?.name || "Not assigned"}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{vendor?.contact && <span>{vendor.contact} &middot; </span>}{vendor?.phone} &middot; {vendor?.location}</div>
              </div>
              {vendor && role === "admin" && (
                <button onClick={() => onVendorClick(vendor.id)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit" }}>
                  <i className="ti ti-external-link" style={{ fontSize: 12 }} /> View vendor
                </button>
              )}
            </div>
            <div style={{ padding: "14px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Item", ...(role === "admin" || role === "accountant" ? ["Vendor cost"] : []), "Committed by", "Actual", "Status"].map(h => (
                      <th key={h} style={{ textAlign: "left", fontSize: 10, color: "var(--color-text-secondary)", padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 8px" }}>{item.name}</td>
                    {(role === "admin" || role === "accountant") && <td style={{ padding: "8px 8px", fontWeight: 500 }}>{item.vendorCost ? formatCurrency(item.vendorCost) : "—"}</td>}
                    <td style={{ padding: "8px 8px", color: "var(--color-text-secondary)" }}>{item.committedDate || "—"}</td>
                    <td style={{ padding: "8px 8px", color: isDelayed ? "#791F1F" : "#27500A" }}>{item.actualDate || "—"}</td>
                    <td style={{ padding: "8px 8px" }}>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 7, fontWeight: 500, background: isDelayed ? "#FAEEDA" : item.actualDate ? "#EAF3DE" : "#F1EFE8", color: isDelayed ? "#633806" : item.actualDate ? "#27500A" : "#444441" }}>
                        {isDelayed ? "Delayed" : item.actualDate ? "On time" : "Pending"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              {item.flags.length > 0 && (
                <div style={{ border: "0.5px solid #F09595", borderRadius: 8, padding: "10px 12px", background: "#FCEBEB", marginTop: 10 }}>
                  {item.flags.map((f, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 10, padding: "6px 0" }}>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 7, background: "#FCEBEB", color: "#791F1F", flexShrink: 0, border: "0.5px solid #F09595" }}>{f.type}</span>
                      <div><div style={{ fontSize: 12 }}>{f.desc}</div><div style={{ fontSize: 11, color: "#A32D2D", marginTop: 2 }}>{f.stage} &middot; {f.date}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {(role === "admin" || role === "accountant") && (
        <>
          <div style={{ height: 0.5, background: "var(--color-border-tertiary)", margin: "16px 0" }} />
          <SectionTitle>Cost summary</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            <StatCard label="Total vendor cost" value={formatCurrency(order.items.reduce((s, i) => s + (i.vendorCost || 0), 0))} />
            <StatCard label="Order value" value={formatCurrency(order.value)} />
            <StatCard label="Gross margin" value={formatCurrency(order.value - order.items.reduce((s, i) => s + (i.vendorCost || 0), 0))} valueColor="#27500A" sub={`${Math.round(((order.value - order.items.reduce((s,i)=>s+(i.vendorCost||0),0)) / order.value) * 100) || 0}%`} />
          </div>
        </>
      )}
      {role === "admin" && (
        <>
          <div style={{ height: 0.5, background: "var(--color-border-tertiary)", margin: "16px 0" }} />
          <SectionTitle>PO exports</SectionTitle>
          {order.items.map(item => {
            const vendor = vendors.find(v => v.id === item.vendorId);
            return (
              <div key={itemKey(item)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}><i className="ti ti-file-text" style={{ fontSize: 14, marginRight: 6, color: "var(--color-text-secondary)" }} />{vendor?.name || "Unassigned"} — PO</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{item.name} &middot; Due {item.committedDate || "—"}</div>
                </div>
                <Btn><i className="ti ti-download" style={{ fontSize: 13 }} /> Export PDF</Btn>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function PaymentsTab({ order, role, onUpdate }) {
  const [newPayment, setNewPayment] = useState({ amount: "", date: "", mode: "UPI", ref: "", notes: "" });
  const totalPaid = order.payments.reduce((s, p) => s + p.amount, 0);
  const balance = order.value - totalPaid;
  const pct = Math.round((totalPaid / order.value) * 100) || 0;

  function addPayment() {
    if (!newPayment.amount || !newPayment.date) return;
    const updated = { ...order, payments: [...order.payments, { id: `p${Date.now()}`, date: newPayment.date, amount: parseInt(newPayment.amount), mode: newPayment.mode, ref: newPayment.ref, by: "Current user" }], _editLogField: "Payment logged" };
    onUpdate(updated);
    setNewPayment({ amount: "", date: "", mode: "UPI", ref: "", notes: "" });
  }

  const modeColors = {
    UPI: { bg: "#EEEDFE", fg: "#3C3489" },
    "Bank transfer": { bg: "#E1F5EE", fg: "#085041" },
    Cash: { bg: "#EAF3DE", fg: "#27500A" },
    Cheque: { bg: "#F1EFE8", fg: "#444441" },
    Card: { bg: "#E6F1FB", fg: "#0C447C" },
    "Payment link": { bg: "#FAEEDA", fg: "#633806" },
    "QR code": { bg: "#FAECE7", fg: "#712B13" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Btn><i className="ti ti-download" style={{ fontSize: 13 }} /> Export payment report</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatCard label="Order value" value={formatCurrency(order.value)} />
        <StatCard label="Total received" value={formatCurrency(totalPaid)} valueColor="#27500A" />
        <StatCard label="Balance due" value={formatCurrency(balance)} valueColor="#633806" />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          <span>Payment progress</span><span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{pct}% received</span>
        </div>
        <div style={{ height: 6, background: "var(--color-background-tertiary)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#639922", borderRadius: 3, width: `${pct}%`, transition: "width 0.3s" }} />
        </div>
      </div>
      <SectionTitle>Payment history</SectionTitle>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["#", "Date", "Amount", "Mode", "Reference", "By"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, color: "var(--color-text-secondary)", padding: "8px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.payments.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No payments logged yet</td></tr>
            )}
            {order.payments.map((p, idx) => {
              const mc = modeColors[p.mode] || modeColors.Cash;
              return (
                <tr key={p.id}>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>0{idx + 1}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{p.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{formatCurrency(p.amount)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}><span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 7, fontWeight: 500, background: mc.bg, color: mc.fg }}>{p.mode}</span></td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{p.ref || "—"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{p.by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Log new payment</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
          {[{ label: "Amount (₹)", key: "amount", type: "number", placeholder: "0" }, { label: "Date", key: "date", type: "date" }].map(f => (
            <div key={f.key}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>{f.label}</div>
              <input type={f.type} placeholder={f.placeholder} value={newPayment[f.key]} onChange={e => setNewPayment(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>Mode</div>
            <select value={newPayment.mode} onChange={e => setNewPayment(p => ({ ...p, mode: e.target.value }))}
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
              {["UPI", "Bank transfer", "Cash", "Cheque", "Card", "Payment link", "QR code"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>Reference / UTR</div>
            <input value={newPayment.ref} onChange={e => setNewPayment(p => ({ ...p, ref: e.target.value }))} placeholder="Transaction reference"
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>Notes</div>
            <input value={newPayment.notes} onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} placeholder="Optional"
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={addPayment} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit", whiteSpace: "nowrap" }}>
              <i className="ti ti-plus" style={{ fontSize: 13 }} /> Log payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── EDIT ORDER MODAL ──────────────────────────────────────
function EditOrderModal({ order, onSave, onClose }) {
  const [form, setForm] = useState({
    orderId: order.id || "",
    channel: order.channel || "",
    salesperson: order.salesperson || "",
    date: order.date || "",
    value: order.value || "",
    notes: order.notes || "",
    custName: order.customer?.name || "",
    custPhone: order.customer?.phone || "",
    custAddress: order.customer?.address || "",
  });

  function save() {
    onSave({
      ...order,
      id: form.orderId.trim() || order.id,
      channel: form.channel,
      salesperson: form.salesperson,
      date: form.date,
      value: parseFloat(form.value) || order.value,
      notes: form.notes,
      customer: { name: form.custName, phone: form.custPhone, address: form.custAddress },
      _editLogField: "Order info",
    });
  }

  const INPUT = { width: "100%", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" };
  const LABEL = { fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 5, fontWeight: 500 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Edit order — {order.id}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20 }}><i className="ti ti-x" /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL}>Order ID</label>
              <input value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} style={INPUT} />
              <div style={{ fontSize: 10, color: "#BA7517", marginTop: 4 }}>Temporary — for importing old orders only</div>
            </div>
            <div>
              <label style={LABEL}>Channel</label>
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={INPUT}>
                {["Bangalore", "Pune", "Jodhpur", "Website", "Wholesale"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL}>Order date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Order value (₹)</label>
              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={INPUT} />
            </div>
          </div>
          <div>
            <label style={LABEL}>Salesperson</label>
            <input value={form.salesperson} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} style={INPUT} />
          </div>
          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Customer</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={LABEL}>Name</label>
                <input value={form.custName} onChange={e => setForm(f => ({ ...f, custName: e.target.value }))} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Phone</label>
                <input value={form.custPhone} onChange={e => setForm(f => ({ ...f, custPhone: e.target.value }))} style={INPUT} />
              </div>
            </div>
            <div>
              <label style={LABEL}>Address</label>
              <textarea value={form.custAddress} onChange={e => setForm(f => ({ ...f, custAddress: e.target.value }))}
                style={{ ...INPUT, minHeight: 70, resize: "vertical" }} placeholder="Delivery address" />
            </div>
          </div>
          <div>
            <label style={LABEL}>Internal notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ ...INPUT, minHeight: 70, resize: "vertical" }} />
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} style={{ fontSize: 13, padding: "8px 22px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

// ── DELETE ORDER MODAL ────────────────────────────────────
// Deliberately distinct from the Archive confirmation: stronger warning language,
// requires typing the order ID to confirm, and is visually red throughout —
// this is the irreversible action, Archive is the reversible one.
function DeleteOrderModal({ order, onConfirm, onClose }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmText.trim() === order.id;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message || "Failed to delete order");
      setDeleting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 28, width: 420, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", border: "1px solid #F09595" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: "#791F1F" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "#791F1F" }}>Permanently delete this order?</div>
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
          This removes <strong style={{ color: "var(--color-text-primary)" }}>{order.id}</strong> and everything in it — line items, photos, payment history, vendor assignments — permanently. This is different from archiving and <strong>cannot be undone</strong>.
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          Type <strong style={{ color: "var(--color-text-primary)" }}>{order.id}</strong> to confirm
        </div>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder={order.id}
          style={{ width: "100%", fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "0.5px solid #F09595", background: "#FCEBEB", color: "var(--color-text-primary)", fontFamily: "inherit", marginBottom: 16 }}
        />
        {error && <div style={{ fontSize: 12, color: "#791F1F", marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleDelete} disabled={!canDelete || deleting}
            style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", background: canDelete ? "#791F1F" : "#cccccc", color: "white", cursor: canDelete ? "pointer" : "not-allowed", fontFamily: "inherit", fontWeight: 500 }}>
            {deleting ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetail({ order, role, vendors, onBack, onUpdate, onDelete, onVendorClick, currentUser, onVendorCreated }) {
  const [tab, setTab] = useState("Order info");
  const [showPrint, setShowPrint] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const maxStageIdx = Math.max(...order.items.map(i => i.stageIndex));
  const channelColors = { Bangalore: "blue", Pune: "gray", Jodhpur: "teal", Website: "blue", Wholesale: "purple" };

  // Tab visibility by role
  const canSeePayments = role === "admin" || role === "sales" || role === "accountant";
  const canSeeVendors = role === "admin" || role === "qc";

  const tabs = ["Order info", "Line items", "Order tracker", ...(canSeeVendors ? ["Vendors & production"] : []), ...(canSeePayments ? ["Payments"] : []), ...(role === "admin" ? ["Costs"] : [])];

  async function handleDeleteConfirmed() {
    await onDelete(order.id);
    setShowDeleteConfirm(false);
  }

  return (
    <div>
      <button onClick={onBack} style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 14, padding: 0, fontFamily: "inherit" }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back to orders
      </button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px" }}>{order.id}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 5 }}>
            <Badge variant={channelColors[order.channel] || "gray"}>{order.channel}</Badge>
            <Badge variant={stageVariant(maxStageIdx)}>{STAGES[maxStageIdx]}</Badge>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Created {order.date} &middot; {order.salesperson}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setShowPrint(true)}><i className="ti ti-printer" style={{ fontSize: 13 }} /> Print</Btn>
          {role === "admin" && <Btn onClick={() => setShowEdit(true)}><i className="ti ti-edit" style={{ fontSize: 13 }} /> Edit</Btn>}
          {role === "admin" && <Btn variant="danger" onClick={() => setShowArchiveConfirm(true)}><i className="ti ti-archive" style={{ fontSize: 13 }} /> Archive</Btn>}
          {role === "admin" && <Btn variant="danger" onClick={() => setShowDeleteConfirm(true)}><i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete</Btn>}
        </div>
      </div>
      {showPrint && <PrintView order={order} vendors={vendors} onClose={() => setShowPrint(false)} />}
      {showEdit && <EditOrderModal order={order} onSave={updated => { onUpdate(updated); setShowEdit(false); }} onClose={() => setShowEdit(false)} />}
      {showArchiveConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 28, width: 380, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Archive this order?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
              The order will be removed from the active dashboard and moved to Past Orders. This can be undone — use Restore from Past Orders to bring it back.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowArchiveConfirm(false)} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={() => { onUpdate({ ...order, status: "archived", _editLogField: "Archived" }); setShowArchiveConfirm(false); onBack(); }} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Archive</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <DeleteOrderModal order={order} onConfirm={handleDeleteConfirmed} onClose={() => setShowDeleteConfirm(false)} />
      )}
      <div style={{ background: "var(--color-background-primary)", borderRadius: "12px 12px 0 0", border: "0.5px solid var(--color-border-tertiary)", borderBottom: "none" }}>
        <TabBar tabs={tabs} active={tab} onSelect={setTab} />
      </div>
      <div style={{ background: "var(--color-background-primary)", borderRadius: "0 0 12px 12px", border: "0.5px solid var(--color-border-tertiary)", borderTop: "none", padding: 16, marginBottom: 12 }}>
        {tab === "Order info" && <OrderInfoTab order={order} role={role} onUpdate={onUpdate} currentUser={currentUser} />}
        {tab === "Line items" && <LineItemsTab order={order} role={role} vendors={vendors} onUpdate={onUpdate} onVendorCreated={onVendorCreated} />}
        {tab === "Order tracker" && <TrackerTab order={order} role={role} vendors={vendors} onUpdate={onUpdate} currentUser={currentUser} />}
        {tab === "Vendors & production" && canSeeVendors && <VendorsTab order={order} vendors={vendors} role={role} onVendorClick={onVendorClick} />}
        {tab === "Payments" && canSeePayments && <PaymentsTab order={order} role={role} onUpdate={onUpdate} />}
        {tab === "Costs" && role === "admin" && <CostApproval order={order} role={role} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}