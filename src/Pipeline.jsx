import { useState, useEffect, useMemo } from "react";
import * as api from "./api";
import { formatCurrency } from "./ui";

const ACTIVE_STAGES = ["New Inquiry", "Warm", "Cold", "Negotiation"];
const ALL_STAGES = ["New Inquiry", "Warm", "Cold", "Negotiation", "Won", "Lost"];
const CHANNELS = ["Bangalore", "Pune", "Jodhpur", "Website", "Wholesale"];
const LOST_REASONS = ["Price", "Bought elsewhere", "Still planning", "No response", "Budget cut", "Other"];
const QUOTED_PLUS = ["Negotiation", "Won"]; // stages counted in pipeline value

const STAGE_COLORS = {
  "New Inquiry": { bg: "#F1EFE8", fg: "#444441", border: "#D8D5CB" },
  "Warm":        { bg: "#FAEEDA", fg: "#633806", border: "#EF9F27" },
  "Cold":        { bg: "#E6F1FB", fg: "#0C447C", border: "#A8CBE8" },
  "Negotiation": { bg: "#EEEDFE", fg: "#3C3489", border: "#B5B2F0" },
  "Won":         { bg: "#EAF3DE", fg: "#27500A", border: "#97C459" },
  "Lost":        { bg: "#FCEBEB", fg: "#791F1F", border: "#F09595" },
};

const VALUE_RANGES = [
  { label: "Any value", min: 0, max: Infinity },
  { label: "Under ₹50K", min: 0, max: 50000 },
  { label: "₹50K – ₹2L", min: 50000, max: 200000 },
  { label: "₹2L – ₹5L", min: 200000, max: 500000 },
  { label: "₹5L+", min: 500000, max: Infinity },
];

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
}

function StagePill({ stage }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS["New Inquiry"];
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.fg, fontWeight: 500, whiteSpace: "nowrap", border: `0.5px solid ${c.border}` }}>
      {stage}
    </span>
  );
}

// ── STATS HEADER ──────────────────────────────────────────
function StatsHeader({ deals, role }) {
  const activeDeals = deals.filter(d => ACTIVE_STAGES.includes(d.stage));
  const closedDeals = deals.filter(d => d.stage === "Won" || d.stage === "Lost");
  const wonDeals = deals.filter(d => d.stage === "Won");

  // Pipeline value = Negotiation + Won stages only
  const pipelineValue = deals
    .filter(d => QUOTED_PLUS.includes(d.stage))
    .reduce((s, d) => s + (d.estimatedValue || 0), 0);

  // Total estimated across all active
  const totalEstimated = activeDeals.reduce((s, d) => s + (d.estimatedValue || 0), 0);

  // Conversion by channel
  const channelStats = CHANNELS.map(ch => {
    const total = deals.filter(d => d.channel === ch).length;
    const won = deals.filter(d => d.channel === ch && d.stage === "Won").length;
    const active = deals.filter(d => d.channel === ch && ACTIVE_STAGES.includes(d.stage)).length;
    const value = deals.filter(d => d.channel === ch && QUOTED_PLUS.includes(d.stage)).reduce((s, d) => s + (d.estimatedValue || 0), 0);
    return { channel: ch, total, won, active, value };
  }).filter(c => c.total > 0);

  // Conversion by salesperson
  const salespeople = [...new Set(deals.map(d => d.salesperson))].filter(Boolean);
  const spStats = salespeople.map(sp => {
    const total = deals.filter(d => d.salesperson === sp).length;
    const won = deals.filter(d => d.salesperson === sp && d.stage === "Won").length;
    const active = deals.filter(d => d.salesperson === sp && ACTIVE_STAGES.includes(d.stage)).length;
    return { sp, total, won, active };
  });

  if (role !== "admin") return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Pipeline value", value: formatCurrency(pipelineValue), sub: "Negotiation & Won", color: "#27500A" },
          { label: "Total estimated", value: formatCurrency(totalEstimated), sub: "All active deals", color: "var(--color-text-primary)" },
          { label: "Active deals", value: activeDeals.length, sub: `${closedDeals.length} closed`, color: "var(--color-text-primary)" },
          { label: "Won", value: wonDeals.length, sub: closedDeals.length > 0 ? `${Math.round(wonDeals.length / closedDeals.length * 100)}% close rate` : "No closed deals", color: "#27500A" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Channel breakdown */}
      {channelStats.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10 }}>By channel</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {channelStats.map(c => (
              <div key={c.channel} style={{ flex: 1, minWidth: 120, padding: "10px 12px", background: "var(--color-background-secondary)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{c.channel}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{c.active} active · {c.won} won</div>
                {c.value > 0 && <div style={{ fontSize: 12, fontWeight: 500, color: "#27500A", marginTop: 3 }}>{formatCurrency(c.value)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salesperson conversion */}
      {spStats.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10 }}>Conversion by salesperson</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {spStats.map(s => {
              const rate = s.total > 0 ? Math.round(s.won / s.total * 100) : 0;
              return (
                <div key={s.sp} style={{ padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.sp}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.active} active · {s.won}/{s.total} won</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: rate > 20 ? "#27500A" : rate > 10 ? "#633806" : "var(--color-text-secondary)" }}>
                    {rate}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NEW DEAL MODAL ────────────────────────────────────────
function NewDealModal({ onSave, onClose, currentUser, salespeople }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    channel: "", enquiry: "", estimatedValue: "",
    salesperson: currentUser?.name || "", stage: "New Inquiry",
    lastContacted: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.customerName.trim()) return;
    setSaving(true);
    try {
      await api.createDeal({ ...form, estimatedValue: parseFloat(form.estimatedValue) || 0 });
      onSave();
    } finally { setSaving(false); }
  }

  const INPUT = { width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" };
  const LABEL = { fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4, fontWeight: 500 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>New deal</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20 }}><i className="ti ti-x" /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LABEL}>Customer name *</label><input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} style={INPUT} placeholder="Full name" /></div>
            <div><label style={LABEL}>Phone</label><input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} style={INPUT} placeholder="+91 XXXXX XXXXX" /></div>
          </div>
          <div><label style={LABEL}>Email</label><input value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} style={INPUT} placeholder="customer@email.com" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LABEL}>Channel</label>
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={INPUT}>
                <option value="">Select channel</option>
                {CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Estimated value (₹)</label><input type="number" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} style={INPUT} placeholder="0" /></div>
          </div>
          <div><label style={LABEL}>Enquiry</label><textarea value={form.enquiry} onChange={e => setForm(f => ({ ...f, enquiry: e.target.value }))} style={{ ...INPUT, minHeight: 70, resize: "vertical" }} placeholder="What are they looking for?" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LABEL}>Salesperson</label>
              <select value={form.salesperson} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} style={INPUT}>
                <option value="">Select</option>
                {salespeople.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={LABEL}>Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} style={INPUT}>
                {ACTIVE_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label style={LABEL}>Last contacted</label><input type="date" value={form.lastContacted} onChange={e => setForm(f => ({ ...f, lastContacted: e.target.value }))} style={INPUT} /></div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} disabled={saving || !form.customerName.trim()} style={{ fontSize: 13, padding: "8px 22px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontWeight: 500, fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Add deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DEAL DETAIL MODAL ─────────────────────────────────────
function DealDetailModal({ deal, onUpdate, onDelete, onClose, onCreateOrder, role, salespeople }) {
  const [logText, setLogText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLostReasons, setShowLostReasons] = useState(false);
  const [showWonConfirm, setShowWonConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: deal.customerName, customerPhone: deal.customerPhone || "",
    customerEmail: deal.customerEmail || "", channel: deal.channel || "",
    enquiry: deal.enquiry || "", estimatedValue: deal.estimatedValue || "",
    salesperson: deal.salesperson, lastContacted: deal.lastContacted || "",
  });

  async function changeStage(stage, extra = {}) {
    setSaving(true);
    try {
      const updated = await api.updateDeal(deal._id, { stage, lastContacted: new Date().toISOString().split("T")[0], ...extra });
      onUpdate(updated);
    } finally { setSaving(false); }
  }

  async function submitLog() {
    if (!logText.trim()) return;
    setSaving(true);
    try {
      const updated = await api.addDealLog(deal._id, logText);
      onUpdate(updated);
      setLogText("");
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const updated = await api.updateDeal(deal._id, { ...editForm, estimatedValue: parseFloat(editForm.estimatedValue) || 0 });
      onUpdate(updated);
      setEditing(false);
    } finally { setSaving(false); }
  }

  const sc = STAGE_COLORS[deal.stage] || STAGE_COLORS["New Inquiry"];
  const days = daysSince(deal.lastContacted);
  const isActive = ACTIVE_STAGES.includes(deal.stage);
  const INPUT = { width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{deal.customerName}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
              {deal.customerPhone && <span>{deal.customerPhone}</span>}
              {deal.customerPhone && deal.customerEmail && <span> &middot; </span>}
              {deal.customerEmail && <span>{deal.customerEmail}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StagePill stage={deal.stage} />
            {!editing && <button onClick={() => setEditing(true)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Edit</button>}
            {role === "admin" && <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, border: "0.5px solid #F09595", background: "transparent", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20 }}><i className="ti ti-x" /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Name</div><input value={editForm.customerName} onChange={e => setEditForm(f => ({ ...f, customerName: e.target.value }))} style={INPUT} /></div>
                <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Phone</div><input value={editForm.customerPhone} onChange={e => setEditForm(f => ({ ...f, customerPhone: e.target.value }))} style={INPUT} /></div>
              </div>
              <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Email</div><input value={editForm.customerEmail} onChange={e => setEditForm(f => ({ ...f, customerEmail: e.target.value }))} style={INPUT} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Channel</div>
                  <select value={editForm.channel} onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))} style={INPUT}>
                    <option value="">—</option>{CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Est. value (₹)</div><input type="number" value={editForm.estimatedValue} onChange={e => setEditForm(f => ({ ...f, estimatedValue: e.target.value }))} style={INPUT} /></div>
              </div>
              <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Enquiry</div><textarea value={editForm.enquiry} onChange={e => setEditForm(f => ({ ...f, enquiry: e.target.value }))} style={{ ...INPUT, minHeight: 60, resize: "vertical" }} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Salesperson</div>
                  <select value={editForm.salesperson} onChange={e => setEditForm(f => ({ ...f, salesperson: e.target.value }))} style={INPUT}>
                    {salespeople.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Last contacted</div><input type="date" value={editForm.lastContacted} onChange={e => setEditForm(f => ({ ...f, lastContacted: e.target.value }))} style={INPUT} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setEditing(false)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={saveEdit} disabled={saving} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Save</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  ["Est. value", deal.estimatedValue ? formatCurrency(deal.estimatedValue) : "—"],
                  ["Channel", deal.channel || "—"],
                  ["Salesperson", deal.salesperson],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              {deal.enquiry && (
                <div style={{ marginBottom: 14, padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Enquiry</div>
                  <div style={{ fontSize: 13 }}>{deal.enquiry}</div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Last contacted:</div>
                <input type="date" defaultValue={deal.lastContacted || ""} onBlur={e => api.updateDeal(deal._id, { lastContacted: e.target.value }).then(onUpdate)}
                  style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
                {days !== null && <span style={{ fontSize: 11, color: days > 7 ? "#791F1F" : days > 3 ? "#633806" : "#27500A", fontWeight: 500 }}>{days === 0 ? "Today" : `${days}d ago`}</span>}
              </div>
            </>
          )}

          {/* Stage actions */}
          {isActive && !editing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>Move to</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACTIVE_STAGES.filter(s => s !== deal.stage).map(s => {
                  const c = STAGE_COLORS[s];
                  return <button key={s} onClick={() => changeStage(s)} disabled={saving} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: `0.5px solid ${c.border}`, background: c.bg, color: c.fg, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>{s}</button>;
                })}
                <button onClick={() => setShowWonConfirm(true)} disabled={saving} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: "0.5px solid #97C459", background: "#EAF3DE", color: "#27500A", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Won</button>
                <button onClick={() => setShowLostReasons(true)} disabled={saving} style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: "0.5px solid #F09595", background: "#FCEBEB", color: "#791F1F", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Lost</button>
              </div>

              {showLostReasons && (
                <div style={{ marginTop: 10, padding: "12px 14px", background: "#FCEBEB", borderRadius: 10, border: "0.5px solid #F09595" }}>
                  <div style={{ fontSize: 12, color: "#791F1F", marginBottom: 8, fontWeight: 500 }}>Why was this deal lost?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {LOST_REASONS.map(r => (
                      <button key={r} onClick={() => { changeStage("Lost", { lostReason: r }); setShowLostReasons(false); onClose(); }}
                        style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>{r}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowLostReasons(false)} style={{ fontSize: 11, marginTop: 8, background: "none", border: "none", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              )}

              {showWonConfirm && (
                <div style={{ marginTop: 10, padding: "12px 14px", background: "#EAF3DE", borderRadius: 10, border: "0.5px solid #97C459" }}>
                  <div style={{ fontSize: 13, color: "#27500A", fontWeight: 500, marginBottom: 6 }}>Mark as Won and create an order?</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowWonConfirm(false)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #97C459", background: "transparent", color: "#27500A", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    {/*
                      FIX (review item #3): channel used to fall back to "" when the deal had
                      no channel set. NewOrderForm's mount effect only calls handleChannelChange
                      (which also triggers onPrefillUsed) when prefill.channel is truthy — so an
                      empty channel meant the prefill was never marked "used", and it would stick
                      around in App.jsx state and cause the New Order form to unexpectedly pop
                      open again on a later, unrelated visit to the Orders page. Defaulting to
                      "Jodhpur" (your home channel) guarantees channel is always truthy, so the
                      prefill always gets consumed and cleared. Still fully editable by the user
                      in Step 1 of the form before they submit.
                    */}
                    <button onClick={async () => { await changeStage("Won"); onCreateOrder({ custName: deal.customerName, custPhone: deal.customerPhone || "", salesperson: deal.salesperson, channel: deal.channel || "Jodhpur" }); onClose(); }}
                      style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Won — Create order</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Linked order — show or manually set */}
          {deal.stage === "Won" && (
            <div style={{ marginBottom: 14 }}>
              {deal.linkedOrderId ? (
                <div style={{ padding: "10px 14px", background: "#EAF3DE", borderRadius: 10, border: "0.5px solid #97C459", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span><i className="ti ti-link" style={{ fontSize: 13, marginRight: 6, color: "#27500A" }} />Linked order: <span style={{ fontWeight: 600, color: "var(--color-text-info)" }}>{deal.linkedOrderId}</span></span>
                  <button onClick={() => api.updateDeal(deal._id, { linkedOrderId: "" }).then(onUpdate)}
                    style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, border: "0.5px solid #97C459", background: "transparent", color: "#27500A", cursor: "pointer", fontFamily: "inherit" }}>Clear</button>
                </div>
              ) : (
                <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: 10, border: "0.5px solid var(--color-border-secondary)" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>Link to order</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input id={`link-order-${deal._id}`} placeholder="e.g. BL-0084" defaultValue=""
                      style={{ flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
                    <button onClick={() => {
                      const val = document.getElementById(`link-order-${deal._id}`).value.trim();
                      if (!val) return;
                      api.updateDeal(deal._id, { linkedOrderId: val }).then(onUpdate);
                    }} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Link</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {deal.stage === "Lost" && deal.lostReason && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#FCEBEB", borderRadius: 10, border: "0.5px solid #F09595", fontSize: 13 }}>
              Lost reason: <span style={{ fontWeight: 600, color: "#791F1F" }}>{deal.lostReason}</span>
            </div>
          )}

          {/* Delete confirm */}
          {confirmDelete && (
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "#FCEBEB", borderRadius: 10, border: "0.5px solid #F09595" }}>
              <div style={{ fontSize: 13, color: "#791F1F", fontWeight: 500, marginBottom: 8 }}>Delete this deal permanently?</div>
              <div style={{ fontSize: 12, color: "#791F1F", marginBottom: 12 }}>This cannot be undone. The deal will be removed from the pipeline.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #F09595", background: "transparent", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                <button onClick={async () => { await api.deleteDeal(deal._id); onDelete(deal._id); onClose(); }}
                  style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Delete permanently</button>
              </div>
            </div>
          )}

          {/* Activity log */}
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10, fontWeight: 500 }}>Activity log</div>
            {deal.logs && deal.logs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {[...deal.logs].reverse().map((log, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: 8, fontSize: 12 }}>
                    <div style={{ marginBottom: 3 }}>{log.text}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{log.author} &middot; {new Date(log.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>No activity logged yet</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={logText} onChange={e => setLogText(e.target.value)} placeholder="Add a note..." onKeyDown={e => e.key === "Enter" && submitLog()}
                style={{ flex: 1, fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
              <button onClick={submitLog} disabled={saving || !logText.trim()} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>Log</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KANBAN VIEW ───────────────────────────────────────────
function KanbanView({ deals, onOpen }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "start" }}>
      {ACTIVE_STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage);
        const sc = STAGE_COLORS[stage];
        const stageValue = stageDeals.reduce((s, d) => s + (d.estimatedValue || 0), 0);
        return (
          <div key={stage}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: sc.fg }}>{stage}</span>
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 5, background: sc.bg, color: sc.fg, fontWeight: 500 }}>{stageDeals.length}</span>
              </div>
              {stageValue > 0 && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{formatCurrency(stageValue)}</span>}
            </div>
            {stageDeals.length === 0
              ? <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 10 }}>No deals</div>
              : stageDeals.map(deal => {
                  const days = daysSince(deal.lastContacted);
                  return (
                    <div key={deal._id} onClick={() => onOpen(deal)}
                      style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", marginBottom: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--color-background-primary)"}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{deal.customerName}</div>
                      {deal.enquiry && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6, lineHeight: 1.4 }}>{deal.enquiry.slice(0, 55)}{deal.enquiry.length > 55 ? "…" : ""}</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {deal.estimatedValue ? <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-info)" }}>{formatCurrency(deal.estimatedValue)}</span> : <span />}
                        {days !== null && <span style={{ fontSize: 10, color: days > 7 ? "#791F1F" : days > 3 ? "#633806" : "#27500A", fontWeight: 500 }}>{days === 0 ? "Today" : `${days}d`}</span>}
                      </div>
                    </div>
                  );
                })
            }
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN PIPELINE ─────────────────────────────────────────
export default function Pipeline({ currentUser, role, onCreateOrder }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table"); // table | kanban | closed
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [openDeal, setOpenDeal] = useState(null);
  const [sortCol, setSortCol] = useState("lastContacted");
  const [sortDir, setSortDir] = useState("desc");

  // Filters
  const [fChannel, setFChannel] = useState("All");
  const [fSalesperson, setFSalesperson] = useState("All");
  const [fStage, setFStage] = useState("All");
  const [fValue, setFValue] = useState(0); // index into VALUE_RANGES
  const [fSearch, setFSearch] = useState("");

  useEffect(() => { loadDeals(); }, []);

  async function loadDeals() {
    setLoading(true);
    try { setDeals(await api.fetchDeals()); } finally { setLoading(false); }
  }

  function handleDelete(id) {
    setDeals(prev => prev.filter(d => d._id !== id));
  }

  function handleUpdate(updated) {
    setDeals(prev => prev.map(d => d._id === updated._id ? updated : d));
    setOpenDeal(updated);
  }

  const salespeople = [...new Set(deals.map(d => d.salesperson))].filter(Boolean).sort();
  const activeDeals = deals.filter(d => ACTIVE_STAGES.includes(d.stage));
  const closedDeals = deals.filter(d => d.stage === "Won" || d.stage === "Lost");

  const vr = VALUE_RANGES[fValue];
  const filtered = useMemo(() => {
    const base = view === "closed" ? closedDeals : activeDeals;
    return base.filter(d => {
      if (fChannel !== "All" && d.channel !== fChannel) return false;
      if (fSalesperson !== "All" && d.salesperson !== fSalesperson) return false;
      if (fStage !== "All" && d.stage !== fStage) return false;
      const val = d.estimatedValue || 0;
      if (val < vr.min || val > vr.max) return false;
      if (fSearch && !d.customerName.toLowerCase().includes(fSearch.toLowerCase()) && !(d.customerPhone || "").includes(fSearch) && !(d.enquiry || "").toLowerCase().includes(fSearch.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      let av = a[sortCol] || "", bv = b[sortCol] || "";
      if (sortCol === "estimatedValue") { av = a.estimatedValue || 0; bv = b.estimatedValue || 0; }
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [deals, view, fChannel, fSalesperson, fStage, fValue, fSearch, sortCol, sortDir]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <i className="ti ti-selector" style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 3 }} />;
    return <i className={`ti ti-sort-${sortDir === "asc" ? "ascending" : "descending"}`} style={{ fontSize: 11, marginLeft: 3 }} />;
  }

  const thStyle = { textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Sales Pipeline</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, overflow: "hidden" }}>
            {[["table", "Table"], ["kanban", "Kanban"], ["closed", "Closed"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                fontSize: 12, padding: "6px 14px", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: view === v ? "var(--color-text-primary)" : "transparent",
                color: view === v ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                fontWeight: view === v ? 500 : 400,
              }}>{l}</button>
            ))}
          </div>
          <button onClick={() => setShowNewDeal(true)} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> New deal
          </button>
        </div>
      </div>

      {/* Stats header — admin only */}
      {!loading && <StatsHeader deals={deals} role={role} />}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={fSearch} onChange={e => setFSearch(e.target.value)} placeholder="Search name, phone, enquiry..."
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 220, fontFamily: "inherit" }} />
        <select value={fChannel} onChange={e => setFChannel(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
          <option value="All">All channels</option>
          {CHANNELS.map(c => <option key={c}>{c}</option>)}
        </select>
        {role === "admin" && (
          <select value={fSalesperson} onChange={e => setFSalesperson(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
            <option value="All">All salespeople</option>
            {salespeople.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
        <select value={fStage} onChange={e => setFStage(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
          <option value="All">All stages</option>
          {(view === "closed" ? ["Won", "Lost"] : ACTIVE_STAGES).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fValue} onChange={e => setFValue(Number(e.target.value))} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
          {VALUE_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
        </select>
        {(fChannel !== "All" || fSalesperson !== "All" || fStage !== "All" || fValue !== 0 || fSearch) && (
          <button onClick={() => { setFChannel("All"); setFSalesperson("All"); setFStage("All"); setFValue(0); setFSearch(""); }}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            Clear filters
          </button>
        )}
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: "auto" }}>{filtered.length} deals</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Loading...</div>
      ) : view === "kanban" ? (
        <KanbanView deals={filtered} onOpen={setOpenDeal} />
      ) : (
        /* Table view — active or closed */
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <th style={thStyle} onClick={() => toggleSort("customerName")}>Customer <SortIcon col="customerName" /></th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Enquiry</th>
                <th style={thStyle} onClick={() => toggleSort("channel")}>Channel <SortIcon col="channel" /></th>
                {role === "admin" && <th style={thStyle} onClick={() => toggleSort("salesperson")}>Salesperson <SortIcon col="salesperson" /></th>}
                <th style={thStyle} onClick={() => toggleSort("stage")}>Stage <SortIcon col="stage" /></th>
                <th style={thStyle} onClick={() => toggleSort("estimatedValue")}>Value <SortIcon col="estimatedValue" /></th>
                <th style={thStyle} onClick={() => toggleSort("lastContacted")}>Last contact <SortIcon col="lastContacted" /></th>
                {view === "closed" && <th style={thStyle}>Reason / Order</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No deals found</td></tr>
              )}
              {filtered.map(deal => {
                const days = daysSince(deal.lastContacted);
                return (
                  <tr key={deal._id} onClick={() => setOpenDeal(deal)} style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{deal.customerName}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{deal.customerPhone || "—"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 220 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.enquiry || "—"}</div>
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>{deal.channel || "—"}</td>
                    {role === "admin" && <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{deal.salesperson}</td>}
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}><StagePill stage={deal.stage} /></td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, color: "var(--color-text-info)" }}>{deal.estimatedValue ? formatCurrency(deal.estimatedValue) : "—"}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                      {deal.lastContacted && <div>{deal.lastContacted}</div>}
                      {days !== null && <div style={{ fontSize: 11, color: days > 7 ? "#791F1F" : days > 3 ? "#633806" : "#27500A", fontWeight: 500 }}>{days === 0 ? "Today" : `${days}d ago`}</div>}
                    </td>
                    {view === "closed" && (
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                        {deal.stage === "Lost" && <span style={{ color: "#791F1F" }}>{deal.lostReason || "—"}</span>}
                        {deal.stage === "Won" && <span style={{ color: "var(--color-text-info)", fontWeight: 500 }}>{deal.linkedOrderId || "No order linked"}</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNewDeal && <NewDealModal currentUser={currentUser} salespeople={salespeople} onSave={() => { setShowNewDeal(false); loadDeals(); }} onClose={() => setShowNewDeal(false)} />}
      {openDeal && <DealDetailModal deal={openDeal} onUpdate={handleUpdate} onDelete={handleDelete} onClose={() => setOpenDeal(null)} onCreateOrder={onCreateOrder} role={role} salespeople={salespeople} />}
    </div>
  );
}