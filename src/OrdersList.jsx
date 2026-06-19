import { useState, useEffect } from "react";
import { Badge, channelVariant, stageVariant, delayStatus, DelayDot, formatCurrency, isNewOrder, isPastOrder, firstItemImageSrc } from "./ui";
import { STAGES, CHANNELS } from "./data";
import NewOrderForm from "./NewOrderForm";

export default function OrdersList({ orders, vendors, role, onOrderClick, onNewOrder, prefill, onPrefillUsed }) {
  const [channelFilter, setChannelFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Auto-open form when a prefill arrives from Pipeline won deal
  useEffect(() => {
    if (prefill) setShowForm(true);
  }, [prefill]);

  const activeOrders = orders.filter(o => o.status !== 'archived' && !isPastOrder(o));

  const filtered = activeOrders.filter(o => {
    if (channelFilter !== "All" && o.channel !== channelFilter) return false;
    if (search && !o.customer.name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {showForm && (
        <NewOrderForm
          vendors={vendors}
          existingOrders={orders}
          currentUser={null}
          prefill={prefill}
          onPrefillUsed={onPrefillUsed}
          onSave={(newOrder) => { onNewOrder(newOrder); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Orders</div>
        {(role === "admin" || role === "sales") && (
          <button onClick={() => setShowForm(true)} style={{
            fontSize: 12, padding: "7px 14px", borderRadius: 8,
            border: "0.5px solid var(--color-border-secondary)",
            background: "#C0392B", color: "white",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit",
          }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> New order
          </button>
        )}
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
              {["", "Order ID", "Date", "Customer", "Items", "Channel", "Value", "Salesperson", "Stage", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No orders found</td></tr>
            )}
            {filtered.map(o => {
              const displayStageIdx = Math.min(...o.items.map(i => i.stageIndex));
              const ds = delayStatus(o);
              const orderIsNew = isNewOrder(o);
              return (
                <tr key={o.id} onClick={() => onOrderClick(o.id)}
                  style={{ cursor: "pointer", background: ds === "overdue" ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = ds === "overdue" ? "#f8d7d7" : orderIsNew ? "#e4f5e4" : "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = ds === "overdue" ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent"}>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", width: 48 }}>
                    {orderIsNew && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 5, background: "#27500A", color: "white", fontWeight: 600, letterSpacing: "0.3px" }}>NEW</span>}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, color: "var(--color-text-info)" }}>{o.id}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{o.customer.name}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {o.items.slice(0, 3).map((item, idx) => {
                        const imgSrc = firstItemImageSrc(item);
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
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}><Badge variant={channelVariant(o.channel)}>{o.channel}</Badge></td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{formatCurrency(o.value)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{o.salesperson}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}><Badge variant={stageVariant(displayStageIdx)}>{STAGES[displayStageIdx]}</Badge></td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                    <DelayDot status={ds} />{ds === "on-track" ? "On track" : ds === "delayed" ? "Delayed" : "Overdue"}
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
