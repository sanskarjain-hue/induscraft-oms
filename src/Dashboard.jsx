import { useState } from "react";
import { Badge, channelVariant, stageVariant, delayStatus, DelayDot, formatCurrency, isNewOrder, isPastOrder } from "./ui";
import { STAGES, CHANNELS } from "./data";

export default function Dashboard({ orders, role, onOrderClick }) {
  const [channelFilter, setChannelFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [statFilter, setStatFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const activeOrders = orders.filter(o => o.status !== "archived" && !isPastOrder(o));

  // Stat counts (always on unfiltered active orders)
  const total = activeOrders.length;
  const pending = activeOrders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) < 2).length;
  const inProd = activeOrders.filter(o => { const s = Math.max(...o.items.map(i => i.stageIndex)); return s >= 2 && s < 6; }).length;
  const dispatched = activeOrders.filter(o => { const s = Math.max(...o.items.map(i => i.stageIndex)); return s >= 6 && s < 8; }).length;
  const completed = activeOrders.filter(o => Math.max(...o.items.map(i => i.stageIndex)) === 8).length;
  const overdue = activeOrders.filter(o => delayStatus(o) === "overdue").length;

  const stats = [
    { key: "total", label: "Total", value: total, color: "var(--color-text-primary)" },
    { key: "pending", label: "Pending", value: pending, color: "#BA7517" },
    { key: "production", label: "In production", value: inProd, color: "var(--color-text-info)" },
    { key: "dispatched", label: "Dispatched", value: dispatched, color: "var(--color-text-primary)" },
    { key: "completed", label: "Completed", value: completed, color: "#27500A" },
    { key: "overdue", label: "Overdue", value: overdue, color: "#E24B4A" },
  ];

  // Filter
  const filtered = activeOrders.filter(o => {
    if (channelFilter !== "All" && o.channel !== channelFilter) return false;
    if (stageFilter !== "All") {
      const maxStage = Math.max(...o.items.map(i => i.stageIndex));
      if (STAGES[maxStage] !== stageFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchesName = o.customer.name.toLowerCase().includes(q);
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesPhone = (o.customer.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
      if (!matchesName && !matchesId && !matchesPhone) return false;
    }
    if (statFilter) {
      const maxStage = Math.max(...o.items.map(i => i.stageIndex));
      if (statFilter === "pending" && maxStage >= 2) return false;
      if (statFilter === "production" && (maxStage < 2 || maxStage >= 6)) return false;
      if (statFilter === "dispatched" && (maxStage < 6 || maxStage >= 8)) return false;
      if (statFilter === "completed" && maxStage !== 8) return false;
      if (statFilter === "overdue" && delayStatus(o) !== "overdue") return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") {
      cmp = (a.date || "").localeCompare(b.date || "");
    } else if (sortBy === "delivery") {
      const da = a.items.reduce((acc, i) => i.currentDelivery > acc ? i.currentDelivery : acc, "");
      const db = b.items.reduce((acc, i) => i.currentDelivery > acc ? i.currentDelivery : acc, "");
      cmp = (da || "").localeCompare(db || "");
    } else if (sortBy === "value") {
      cmp = (a.value || 0) - (b.value || 0);
    } else if (sortBy === "stage") {
      cmp = Math.min(...a.items.map(i => i.stageIndex)) - Math.min(...b.items.map(i => i.stageIndex));
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function toggleStatFilter(key) {
    setStatFilter(prev => prev === key ? null : key);
  }

  const sortArrow = (field) => sortBy === field ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  const TH = ({ field, children, style }) => (
    <th onClick={() => toggleSort(field)} style={{
      textAlign: "left", fontSize: 11,
      color: sortBy === field ? "var(--color-text-primary)" : "var(--color-text-secondary)",
      padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)",
      fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", ...style,
    }}>
      {children}{sortArrow(field)}
    </th>
  );

  const plainTH = (label) => (
    <th style={{ textAlign: "left", fontSize: 11, color: "var(--color-text-secondary)", padding: "9px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{label}</th>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Dashboard</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 10, marginBottom: 20 }}>
        {stats.map(s => {
          const active = statFilter === s.key || (statFilter === null && s.key === "total");
          return (
            <div key={s.key} onClick={() => toggleStatFilter(s.key === "total" ? null : s.key)}
              style={{
                background: active ? "var(--color-background-primary)" : "var(--color-background-secondary)",
                border: `1px solid ${active ? s.color : "var(--color-border-tertiary)"}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                transition: "border-color 0.15s",
              }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, or order ID..."
          style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 260, fontFamily: "inherit" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {["All", ...CHANNELS].map(c => (
            <button key={c} onClick={() => setChannelFilter(c)} style={{
              fontSize: 12, padding: "5px 11px", borderRadius: 7,
              border: "0.5px solid var(--color-border-secondary)",
              background: channelFilter === c ? "var(--color-background-primary)" : "transparent",
              color: channelFilter === c ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: channelFilter === c ? 500 : 400, cursor: "pointer", fontFamily: "inherit",
            }}>{c}</button>
          ))}
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
          <option>All</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(statFilter || channelFilter !== "All" || stageFilter !== "All" || search) && (
          <button onClick={() => { setStatFilter(null); setChannelFilter("All"); setStageFilter("All"); setSearch(""); }}
            style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-danger)", background: "transparent", color: "var(--color-text-danger)", cursor: "pointer", fontFamily: "inherit" }}>
            Clear filters
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {sorted.length} order{sorted.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary)" }}>
              <TH field="date">Order date</TH>
              {plainTH("Order ID")}
              {plainTH("Customer")}
              {plainTH("Channel")}
              <TH field="value">Value</TH>
              <TH field="stage">Stage</TH>
              <TH field="delivery">Exp. delivery</TH>
              {plainTH("Status")}
            </tr>
          </thead>
          <tbody>
            {sorted.map(o => {
              const displayStageIdx = Math.min(...o.items.map(i => i.stageIndex));
              const latestDelivery = o.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");
              const ds = delayStatus(o);
              const orderIsNew = isNewOrder(o);
              return (
                <tr key={o.id} onClick={() => onOrderClick(o.id)}
                  style={{ cursor: "pointer", background: ds === "overdue" ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent" }}
                  onMouseEnter={e => e.currentTarget.style.background = ds === "overdue" ? "#f8d7d7" : orderIsNew ? "#e4f5e4" : "var(--color-background-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = ds === "overdue" ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent"}>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", fontSize: 12 }}>{o.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500, color: ds === "overdue" ? "#791F1F" : "var(--color-text-info)" }}>
                    {o.id}
                    {orderIsNew && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#27500A", color: "white", fontWeight: 600, marginLeft: 6, letterSpacing: "0.3px", verticalAlign: "middle" }}>NEW</span>}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div>{o.customer.name}</div>
                    {o.customer.phone && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{o.customer.phone}</div>}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <Badge variant={channelVariant(o.channel)}>{o.channel}</Badge>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontWeight: 500 }}>{formatCurrency(o.value)}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <Badge variant={stageVariant(displayStageIdx)}>{STAGES[displayStageIdx]}</Badge>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{latestDelivery || "\u2014"}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <DelayDot status={ds} />
                      {ds === "on-track" ? "On track" : ds === "delayed" ? "Delayed" : "Overdue"}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No orders found</div>
        )}
      </div>
    </div>
  );
}
