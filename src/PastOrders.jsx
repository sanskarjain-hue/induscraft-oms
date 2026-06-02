import { useState } from "react";
import { Badge, channelVariant, stageVariant, formatCurrency } from "./ui";
import { STAGES, CHANNELS } from "./data";

const isPast = o => {
  if (o.status === "archived") return true;
  if (!o.items.every(i => i.stageIndex === 8)) return false;
  const latest = o.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");
  if (!latest) return false;
  return (new Date() - new Date(latest)) / (1000 * 60 * 60 * 24) >= 10;
};

export default function PastOrders({ orders, role, onOrderClick, onUpdate }) {
  const [channelFilter, setChannelFilter] = useState("All");
  const [search, setSearch] = useState("");

  const pastOrders = orders.filter(isPast);

  const filtered = pastOrders.filter(o => {
    if (channelFilter !== "All" && o.channel !== channelFilter) return false;
    if (search && !o.customer.name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>Past Orders</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
            Completed orders (10+ days) and archived orders — {pastOrders.length} total
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer or order ID..."
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 240, fontFamily: "inherit" }} />
        {["All", ...CHANNELS].map(c => (
          <button key={c} onClick={() => setChannelFilter(c)} style={{
            fontSize: 12, padding: "5px 11px", borderRadius: 7,
            border: "0.5px solid var(--color-border-secondary)",
            background: channelFilter === c ? "var(--color-background-secondary)" : "transparent",
            color: channelFilter === c ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: channelFilter === c ? 500 : 400, cursor: "pointer", fontFamily: "inherit"
          }}>{c}</button>
        ))}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              {["Order ID", "Date", "Customer", "Channel", "Value", "Salesperson", "Status", ""].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No past orders yet</td></tr>
            )}
            {filtered.map(o => {
              const isArchived = o.status === "archived";
              return (
                <tr key={o.id} onClick={() => onOrderClick(o.id)}
                  style={{ cursor: "pointer", opacity: isArchived ? 0.7 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, color: "var(--color-text-info)" }}>{o.id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{o.customer.name}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}><Badge variant={channelVariant(o.channel)}>{o.channel}</Badge></td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{formatCurrency(o.value)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.salesperson}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {isArchived
                      ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: "#F1EFE8", color: "#444441", fontWeight: 500 }}>Archived</span>
                      : <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: "#EAF3DE", color: "#27500A", fontWeight: 500 }}>Completed</span>
                    }
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {isArchived && role === "admin" && (
                      <button onClick={e => { e.stopPropagation(); onUpdate({ ...o, status: "active" }); }}
                        style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
