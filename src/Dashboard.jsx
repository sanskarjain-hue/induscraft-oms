import { useState } from "react";
import { Badge, channelVariant, stageVariant, delayStatus, DelayDot, MiniPipeline, formatCurrency } from "./ui";
import { STAGES, CHANNELS } from "./data";

export default function Dashboard({ orders, role, onOrderClick }) {
  const [channelFilter, setChannelFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = orders.filter(o => {
    if (channelFilter !== "All" && o.channel !== channelFilter) return false;
    if (role === "sales" && o.salesperson !== "Kishore" && o.salesperson !== "Ramesh" && o.salesperson !== "Sanskar") {
      // sales sees all but can only edit their own
    }
    if (search && !o.customer.name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    const maxStage = Math.max(...o.items.map(i => i.stageIndex));
    if (stageFilter !== "All" && STAGES[maxStage] !== stageFilter) return false;
    return true;
  });

  const total = orders.length;
  const pending = orders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) < 2).length;
  const inProd = orders.filter(o => { const s = Math.max(...o.items.map(i => i.stageIndex)); return s >= 2 && s < 6; }).length;
  const dispatched = orders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) === 6).length;
  const completed = orders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) === 8).length;
  const overdue = orders.filter(o => delayStatus(o) === "overdue").length;

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
              {["Order ID", "Date", "Customer", "Items", "Channel", "Value", "Salesperson", "Stage", "Exp. delivery", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const maxStageIdx = Math.max(...o.items.map(i => i.stageIndex));
              const latestDelivery = o.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");
              const ds = delayStatus(o);
              return (
                <tr key={o.id} onClick={() => onOrderClick(o.id)}
                  style={{ cursor: "pointer", background: ds === "overdue" ? "#FCEBEB" : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = ds === "overdue" ? "#f8d7d7" : "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = ds === "overdue" ? "#FCEBEB" : "transparent"}>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, color: ds === "overdue" ? "#791F1F" : "var(--color-text-info)" }}>{o.id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{o.customer.name}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {o.items.slice(0, 3).map((item, idx) => {
                        const firstImg = item.images && item.images.length > 0 && item.images[0].data ? item.images[0] : null;
                        return (
                          <div key={idx} title={item.name} style={{ width: 32, height: 32, borderRadius: 6, overflow: "hidden", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {firstImg ? (
                              <img src={firstImg.data} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                    <Badge variant={stageVariant(maxStageIdx)}>{STAGES[maxStageIdx]}</Badge>
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