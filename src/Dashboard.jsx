import { useState } from "react";
import { Badge, channelVariant, stageVariant, delayStatus, DelayDot, MiniPipeline, formatCurrency } from "./ui";
import { STAGES, CHANNELS } from "./data";

// ── STAGE TIMER ───────────────────────────────────────────
const STAGE_DURATIONS = {
  0: 3,   // Looking for vendor — 3 days
  1: 14,  // Processing started — 14 days
  2: null, // Raw ready — gate, no timer
  3: 7,   // Finishing — 7 days
  4: 7,   // QC — 7 days
  5: 7,   // Packed — 7 days
  6: 7,   // Dispatched — 7 days
  7: null, // Delivered to warehouse — paused (awaiting customer)
  8: null, // Delivered to customer — done
};

function getStageTimer(item, orderDate) {
  const stage = item.stageIndex;
  const duration = STAGE_DURATIONS[stage];
  if (duration === null || duration === undefined) return null;

  let enteredAt = null;
  if (item.stageHistory && item.stageHistory.length > 0) {
    const entry = [...item.stageHistory].reverse().find(h => h.stageIndex === stage);
    if (entry) enteredAt = new Date(entry.enteredAt);
  }
  if (!enteredAt && stage === 0 && orderDate) {
    enteredAt = new Date(orderDate);
  }
  if (!enteredAt) return null;

  const deadline = new Date(enteredAt);
  deadline.setDate(deadline.getDate() + duration);
  const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  return { daysLeft, deadline };
}

function TimerPill({ item, orderDate, compact = false }) {
  const timer = getStageTimer(item, orderDate);
  if (!timer) return null;
  const { daysLeft } = timer;
  const color = daysLeft > 2 ? { bg: "#EAF3DE", fg: "#27500A" } :
                daysLeft > 0 ? { bg: "#FAEEDA", fg: "#633806" } :
                { bg: "#FCEBEB", fg: "#791F1F" };
  const label = daysLeft > 0
    ? compact ? `${daysLeft}d` : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
    : compact ? `${Math.abs(daysLeft)}d late` : `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""}`;
  return (
    <span style={{ fontSize: compact ? 10 : 11, padding: compact ? "1px 6px" : "2px 8px", borderRadius: 6, background: color.bg, color: color.fg, fontWeight: 500, whiteSpace: "nowrap" }}>
      {!compact && <i className="ti ti-clock" style={{ fontSize: 10, marginRight: 3 }} />}
      {label}
    </span>
  );
}

function getOrderTimerStatus(order) {
  let worst = null;
  for (const item of order.items) {
    const t = getStageTimer(item, order.date);
    if (!t) continue;
    if (!worst || t.daysLeft < worst.daysLeft) worst = t;
  }
  return worst;
}

const isNew = o => !o.deliveryConfirmed && o.items.every(i => i.stageIndex === 0);

const isPast = o => {
  if (!o.items.every(i => i.stageIndex === 8)) return false;
  const latest = o.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");
  if (!latest) return false;
  const diff = (new Date() - new Date(latest)) / (1000 * 60 * 60 * 24);
  return diff >= 10;
};

export default function Dashboard({ orders, role, onOrderClick }) {
  const [channelFilter, setChannelFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [search, setSearch] = useState("");

  const activeOrders = orders.filter(o => o.status !== 'archived' && !isPast(o));

  const filtered = activeOrders.filter(o => {
    if (channelFilter !== "All" && o.channel !== channelFilter) return false;
    if (role === "sales" && o.salesperson !== "Kishore" && o.salesperson !== "Ramesh" && o.salesperson !== "Sanskar") {
      // sales sees all but can only edit their own
    }
    if (search && !o.customer.name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    const maxStage = Math.max(...o.items.map(i => i.stageIndex));
    if (stageFilter !== "All" && STAGES[maxStage] !== stageFilter) return false;
    return true;
  });

  const total = activeOrders.length;
  const pending = activeOrders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) < 2).length;
  const inProd = activeOrders.filter(o => { const s = Math.max(...o.items.map(i => i.stageIndex)); return s >= 2 && s < 6; }).length;
  const dispatched = activeOrders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) === 6).length;
  const completed = activeOrders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) === 8).length;
  const overdue = activeOrders.filter(o => delayStatus(o) === "overdue").length;

  const stats = [
    { label: "Total orders", value: total, color: "var(--color-text-primary)" },
    { label: "Pending", value: pending, color: "#BA7517" },
    { label: "In production", value: inProd, color: "var(--color-text-info)" },
    { label: "Dispatched", value: dispatched, color: "var(--color-text-primary)" },
    { label: "Completed", value: completed, color: "#27500A" },
    { label: "Overdue", value: overdue, color: "#E24B4A" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Channel</span>
          <div style={{ display: "flex", gap: 4 }}>
            {["All", ...CHANNELS].map(c => (
              <button key={c} onClick={() => setChannelFilter(c)} style={{
                fontSize: 12, padding: "5px 11px", borderRadius: 7,
                border: "0.5px solid var(--color-border-secondary)",
                background: channelFilter === c ? "var(--color-background-primary)" : "transparent",
                color: channelFilter === c ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontWeight: channelFilter === c ? 500 : 400, cursor: "pointer",
                fontFamily: "inherit"
              }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} onClick={() => {}} style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 10, padding: "14px 16px", cursor: "pointer"
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Orders</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer or order ID..."
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 220, fontFamily: "inherit" }} />
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
            <option>All</option>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["", "Order ID", "Date", "Customer", "Items", "Channel", "Value", "Salesperson", "Stage", "Timer", "Exp. delivery", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              // displayStageIdx = slowest item (min) — reflects true order progress
              // maxStageIdx kept separately for overdue detection only
              const displayStageIdx = Math.min(...o.items.map(i => i.stageIndex));
              const maxStageIdx = Math.max(...o.items.map(i => i.stageIndex));
              const latestDelivery = o.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");
              const ds = delayStatus(o);
              const orderIsNew = isNew(o);
              return (
                <tr key={o.id} onClick={() => onOrderClick(o.id)}
                  style={{ cursor: "pointer", background: ds === "overdue" ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = ds === "overdue" ? "#f8d7d7" : orderIsNew ? "#e4f5e4" : "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = ds === "overdue" ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent"}>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", width: 48 }}>
                    {orderIsNew && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "#27500A", color: "white", fontWeight: 600, letterSpacing: "0.3px" }}>NEW</span>}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, color: ds === "overdue" ? "#791F1F" : "var(--color-text-info)" }}>{o.id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{o.customer.name}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {o.items.slice(0, 3).map((item, idx) => {
                        const firstImg = item.images && item.images.length > 0 ? item.images[0] : null;
                        const imgSrc = firstImg ? (firstImg.url || firstImg.data) : null;
                        return (
                          <div key={idx} title={item.name} style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {imgSrc ? (
                              <img src={imgSrc} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <i className="ti ti-armchair" style={{ fontSize: 14, color: "var(--color-text-secondary)" }} />
                            )}
                          </div>
                        );
                      })}
                      {o.items.length > 3 && (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                          +{o.items.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <Badge variant={channelVariant(o.channel)}>{o.channel}</Badge>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{formatCurrency(o.value)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.salesperson}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <Badge variant={stageVariant(displayStageIdx)}>{STAGES[displayStageIdx]}</Badge>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {(() => {
                      const t = getOrderTimerStatus(o);
                      if (!t) return <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>—</span>;
                      const { daysLeft } = t;
                      const color = daysLeft > 2 ? { bg: "#EAF3DE", fg: "#27500A" } : daysLeft > 0 ? { bg: "#FAEEDA", fg: "#633806" } : { bg: "#FCEBEB", fg: "#791F1F" };
                      const label = daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d late`;
                      return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: color.bg, color: color.fg, fontWeight: 500 }}>{label}</span>;
                    })()}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{latestDelivery}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                    <DelayDot status={ds} />
                    {ds === "on-track" ? "On track" : ds === "delayed" ? "Delayed" : "Overdue"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No orders found</div>
        )}
      </div>
    </div>
  );
}