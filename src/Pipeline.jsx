import { useState, useEffect } from "react";
import * as api from "./api";
import { formatCurrency } from "./ui";

const ACTIVE_STAGES = ["Lead", "Design & Concept", "Quoted", "Negotiation"];
const CHANNELS = ["Bangalore", "Pune", "Jodhpur", "Website", "Wholesale"];
const LOST_REASONS = ["Price", "Bought elsewhere", "Still planning", "No response", "Budget cut", "Other"];

const STAGE_COLORS = {
  "Lead":             { bg: "#F1EFE8", fg: "#444441", border: "#D8D5CB" },
  "Design & Concept": { bg: "#E6F1FB", fg: "#0C447C", border: "#A8CBE8" },
  "Quoted":           { bg: "#FAEEDA", fg: "#633806", border: "#EF9F27" },
  "Negotiation":      { bg: "#EEEDFE", fg: "#3C3489", border: "#B5B2F0" },
  "Won":              { bg: "#EAF3DE", fg: "#27500A", border: "#97C459" },
  "Lost":             { bg: "#FCEBEB", fg: "#791F1F", border: "#F09595" },
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function DealCard({ deal, onStageChange, onOpen }) {
  const sc = STAGE_COLORS[deal.stage] || STAGE_COLORS["Lead"];
  const days = daysSince(deal.lastContacted);

  return (
    <div onClick={() => onOpen(deal)} style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 10, padding: "12px 14px", cursor: "pointer", marginBottom: 8,
    }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
      onMouseLeave={e => e.currentTarget.style.background = "var(--color-background-primary)"}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--color-text-primary)" }}>{deal.customerName}</div>
      {deal.enquiry && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6, lineHeight: 1.4 }}>{deal.enquiry.slice(0, 60)}{deal.enquiry.length > 60 ? "…" : ""}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        {deal.estimatedValue ? (
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-info)" }}>{formatCurrency(deal.estimatedValue)}</span>
        ) : <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>No value set</span>}
        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 5, background: sc.bg, color: sc.fg, fontWeight: 500 }}>{deal.channel || "—"}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{deal.salesperson}</span>
        {days !== null && (
          <span style={{ fontSize: 10, color: days > 7 ? "#791F1F" : days > 3 ? "#633806" : "#27500A", fontWeight: 500 }}>
            {days === 0 ? "Contacted today" : `${days}d since contact`}
          </span>
        )}
      </div>
    </div>
  );
}

function NewDealModal({ onSave, onClose, currentUser }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    channel: "", enquiry: "", estimatedValue: "",
    salesperson: currentUser?.name || "", stage: "Lead", lastContacted: new Date().toISOString().split("T")[0],
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
          <div><label style={LABEL}>Enquiry — what are they looking for?</label><textarea value={form.enquiry} onChange={e => setForm(f => ({ ...f, enquiry: e.target.value }))} style={{ ...INPUT, minHeight: 70, resize: "vertical" }} placeholder="e.g. 3-seater sofa + dining table for new apartment" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LABEL}>Salesperson</label><input value={form.salesperson} onChange={e => setForm(f => ({ ...f, salesperson: e.target.value }))} style={INPUT} /></div>
            <div><label style={LABEL}>Last contacted</label><input type="date" value={form.lastContacted} onChange={e => setForm(f => ({ ...f, lastContacted: e.target.value }))} style={INPUT} /></div>
          </div>
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

function DealDetailModal({ deal, onUpdate, onClose, onCreateOrder, role }) {
  const [logText, setLogText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLostReasons, setShowLostReasons] = useState(false);
  const [showWonConfirm, setShowWonConfirm] = useState(false);

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

  async function updateLastContacted(date) {
    const updated = await api.updateDeal(deal._id, { lastContacted: date });
    onUpdate(updated);
  }

  const sc = STAGE_COLORS[deal.stage] || STAGE_COLORS["Lead"];
  const days = daysSince(deal.lastContacted);
  const isActive = ACTIVE_STAGES.includes(deal.stage);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{deal.customerName}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
              {deal.customerPhone && <span>{deal.customerPhone} &nbsp;&middot;&nbsp; </span>}
              {deal.customerEmail && <span>{deal.customerEmail}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, background: sc.bg, color: sc.fg, fontWeight: 600, border: `0.5px solid ${sc.border}` }}>{deal.stage}</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20 }}><i className="ti ti-x" /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Key info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              ["Estimated value", deal.estimatedValue ? formatCurrency(deal.estimatedValue) : "—"],
              ["Channel", deal.channel || "—"],
              ["Salesperson", deal.salesperson],
            ].map(([l, v]) => (
              <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Enquiry */}
          {deal.enquiry && (
            <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--color-background-secondary)", borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>Enquiry</div>
              <div style={{ fontSize: 13 }}>{deal.enquiry}</div>
            </div>
          )}

          {/* Last contacted */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Last contacted:</div>
            <input type="date" defaultValue={deal.lastContacted || ""} onBlur={e => updateLastContacted(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
            {days !== null && <span style={{ fontSize: 11, color: days > 7 ? "#791F1F" : days > 3 ? "#633806" : "#27500A", fontWeight: 500 }}>{days === 0 ? "Today" : `${days} days ago`}</span>}
          </div>

          {/* Stage actions */}
          {isActive && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>Move to</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACTIVE_STAGES.filter(s => s !== deal.stage).map(s => {
                  const c = STAGE_COLORS[s];
                  return (
                    <button key={s} onClick={() => changeStage(s)} disabled={saving}
                      style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: `0.5px solid ${c.border}`, background: c.bg, color: c.fg, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                      {s}
                    </button>
                  );
                })}
                <button onClick={() => setShowWonConfirm(true)} disabled={saving}
                  style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: "0.5px solid #97C459", background: "#EAF3DE", color: "#27500A", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  Won
                </button>
                <button onClick={() => setShowLostReasons(true)} disabled={saving}
                  style={{ fontSize: 12, padding: "5px 14px", borderRadius: 8, border: "0.5px solid #F09595", background: "#FCEBEB", color: "#791F1F", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                  Lost
                </button>
              </div>

              {/* Lost reason dropdown */}
              {showLostReasons && (
                <div style={{ marginTop: 10, padding: "12px 14px", background: "#FCEBEB", borderRadius: 10, border: "0.5px solid #F09595" }}>
                  <div style={{ fontSize: 12, color: "#791F1F", marginBottom: 8, fontWeight: 500 }}>Why was this deal lost?</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {LOST_REASONS.map(r => (
                      <button key={r} onClick={() => { changeStage("Lost", { lostReason: r }); setShowLostReasons(false); onClose(); }}
                        style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowLostReasons(false)} style={{ fontSize: 11, marginTop: 8, background: "none", border: "none", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              )}

              {/* Won confirm */}
              {showWonConfirm && (
                <div style={{ marginTop: 10, padding: "12px 14px", background: "#EAF3DE", borderRadius: 10, border: "0.5px solid #97C459" }}>
                  <div style={{ fontSize: 13, color: "#27500A", fontWeight: 500, marginBottom: 8 }}>Mark as Won and create an order?</div>
                  <div style={{ fontSize: 12, color: "#3B6D11", marginBottom: 12 }}>
                    This will move the deal to Won and open a new order form with the customer details pre-filled.
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowWonConfirm(false)} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid #97C459", background: "transparent", color: "#27500A", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                    <button onClick={async () => {
                      await changeStage("Won");
                      onCreateOrder({
                        custName: deal.customerName,
                        custPhone: deal.customerPhone || "",
                        salesperson: deal.salesperson,
                        channel: deal.channel || "",
                      });
                      onClose();
                    }} style={{ fontSize: 12, padding: "6px 16px", borderRadius: 8, border: "none", background: "#27500A", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
                      Won — Create order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Linked order */}
          {deal.linkedOrderId && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#EAF3DE", borderRadius: 10, border: "0.5px solid #97C459", fontSize: 13 }}>
              <i className="ti ti-link" style={{ fontSize: 13, marginRight: 6, color: "#27500A" }} />
              Linked order: <span style={{ fontWeight: 600, color: "var(--color-text-info)" }}>{deal.linkedOrderId}</span>
            </div>
          )}

          {/* Lost reason */}
          {deal.stage === "Lost" && deal.lostReason && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "#FCEBEB", borderRadius: 10, border: "0.5px solid #F09595", fontSize: 13 }}>
              <i className="ti ti-x" style={{ fontSize: 13, marginRight: 6, color: "#791F1F" }} />
              Lost reason: <span style={{ fontWeight: 600, color: "#791F1F" }}>{deal.lostReason}</span>
            </div>
          )}

          {/* Notes log */}
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
            ) : (
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>No activity logged yet</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={logText} onChange={e => setLogText(e.target.value)} placeholder="Add a note..."
                onKeyDown={e => e.key === "Enter" && submitLog()}
                style={{ flex: 1, fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
              <button onClick={submitLog} disabled={saving || !logText.trim()}
                style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                Log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline({ currentUser, role, onCreateOrder }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban"); // kanban | closed
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [openDeal, setOpenDeal] = useState(null);

  useEffect(() => { loadDeals(); }, []);

  async function loadDeals() {
    setLoading(true);
    try {
      const data = await api.fetchDeals();
      setDeals(data);
    } finally { setLoading(false); }
  }

  function handleUpdate(updated) {
    setDeals(prev => prev.map(d => d._id === updated._id ? updated : d));
    setOpenDeal(updated);
  }

  const activeDeals = deals.filter(d => ACTIVE_STAGES.includes(d.stage));
  const closedDeals = deals.filter(d => d.stage === "Won" || d.stage === "Lost");

  const totalPipeline = activeDeals.reduce((s, d) => s + (d.estimatedValue || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>Sales Pipeline</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
            {activeDeals.length} active deals &nbsp;&middot;&nbsp; {formatCurrency(totalPipeline)} pipeline value
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, overflow: "hidden" }}>
            {[["kanban", "Kanban"], ["closed", "Closed"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{
                fontSize: 12, padding: "6px 14px", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: view === v ? "var(--color-text-primary)" : "transparent",
                color: view === v ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                fontWeight: view === v ? 500 : 400,
              }}>{l}</button>
            ))}
          </div>
          <button onClick={() => setShowNewDeal(true)} style={{
            fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "none",
            background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> New deal
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Loading...</div>
      ) : view === "kanban" ? (
        /* Kanban board */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "start" }}>
          {ACTIVE_STAGES.map(stage => {
            const stageDeals = activeDeals.filter(d => d.stage === stage);
            const sc = STAGE_COLORS[stage];
            const stageValue = stageDeals.reduce((s, d) => s + (d.estimatedValue || 0), 0);
            return (
              <div key={stage}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: sc.fg }}>{stage}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 5, background: sc.bg, color: sc.fg, fontWeight: 500 }}>{stageDeals.length}</span>
                  </div>
                  {stageValue > 0 && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{formatCurrency(stageValue)}</span>}
                </div>
                <div style={{ minHeight: 80 }}>
                  {stageDeals.length === 0 ? (
                    <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 10 }}>No deals</div>
                  ) : (
                    stageDeals.map(deal => (
                      <DealCard key={deal._id} deal={deal} onOpen={setOpenDeal} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Closed deals */
        <div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>{closedDeals.length} closed deals</div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Customer", "Enquiry", "Value", "Salesperson", "Status", "Reason / Order", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedDeals.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No closed deals yet</td></tr>
                )}
                {closedDeals.map(deal => {
                  const sc = STAGE_COLORS[deal.stage];
                  return (
                    <tr key={deal._id}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{deal.customerName}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", maxWidth: 180 }}>{deal.enquiry?.slice(0, 50) || "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{deal.estimatedValue ? formatCurrency(deal.estimatedValue) : "—"}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{deal.salesperson}</td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: sc.bg, color: sc.fg, fontWeight: 500 }}>{deal.stage}</span>
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                        {deal.stage === "Lost" && deal.lostReason && <span style={{ color: "#791F1F" }}>{deal.lostReason}</span>}
                        {deal.stage === "Won" && deal.linkedOrderId && <span style={{ color: "var(--color-text-info)", fontWeight: 500 }}>{deal.linkedOrderId}</span>}
                        {deal.stage === "Won" && !deal.linkedOrderId && <span style={{ color: "var(--color-text-secondary)" }}>No order linked</span>}
                      </td>
                      <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                        <button onClick={() => setOpenDeal(deal)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNewDeal && (
        <NewDealModal
          currentUser={currentUser}
          onSave={() => { setShowNewDeal(false); loadDeals(); }}
          onClose={() => setShowNewDeal(false)}
        />
      )}

      {openDeal && (
        <DealDetailModal
          deal={openDeal}
          onUpdate={handleUpdate}
          onClose={() => setOpenDeal(null)}
          onCreateOrder={onCreateOrder}
          role={role}
        />
      )}
    </div>
  );
}
