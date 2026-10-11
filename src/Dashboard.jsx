import { useState } from "react";
import {
  Badge, channelVariant, stageVariant, delayStatus, DelayDot, formatCurrency, isNewOrder, isPastOrder,
  orderStage, stageBucket, getOrderAttention, urgencyScore, daysOverdue,
  formatDeliveryDate, latestDeliveryDate, startOfToday, ATTENTION_TYPES,
  CountUp,
} from "./ui";
import { STAGES, CHANNELS } from "./data";

const ATTENTION_ORDER = ["vendor", "raw", "warehouse", "qcfail"];

export default function Dashboard({ orders, role, onOrderClick }) {
  const [channelFilter, setChannelFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [statFilter, setStatFilter] = useState(null);
  const [attentionFilter, setAttentionFilter] = useState(null);
  const [search, setSearch] = useState("");
  // Default: most urgent first (overdue, then blocked at a gate, then nearest delivery date).
  const [sortBy, setSortBy] = useState("urgency");
  const [sortDir, setSortDir] = useState("desc");

  const today = startOfToday();
  const activeOrders = orders.filter(o => o.status !== "archived" && !isPastOrder(o));

  // Per-order facts, computed once per render and reused by the cards, strip, filters, sort and rows.
  const meta = new Map(activeOrders.map(o => {
    const attention = getOrderAttention(o);
    const late = daysOverdue(o, today);
    return [o.id, {
      stage: orderStage(o),
      attention,
      late,
      overdue: late > 0,
      score: urgencyScore(o, attention, today),
    }];
  }));

  // Stat counts (always on unfiltered active orders). Each order is counted ONCE, by its
  // least-advanced item, so the cards, the stage filter and the Stage column always agree.
  const bucketCount = key => activeOrders.filter(o => stageBucket(meta.get(o.id).stage) === key).length;
  const total = activeOrders.length;
  const pending = bucketCount("pending");
  const inProd = bucketCount("production");
  const dispatched = bucketCount("dispatched");
  const completed = bucketCount("completed");
  const overdue = activeOrders.filter(o => meta.get(o.id).overdue).length;

  const stats = [
    { key: "total", label: "Total", sub: "Active orders", value: total, color: "var(--color-text-primary)" },
    { key: "pending", label: "Pending", sub: `${STAGES[0]} \u2192 ${STAGES[1]}`, value: pending, color: "#BA7517" },
    { key: "production", label: "In production", sub: `${STAGES[2]} \u2192 ${STAGES[5]}`, value: inProd, color: "var(--color-text-info)" },
    { key: "dispatched", label: "Dispatched", sub: `${STAGES[6]} \u2192 ${STAGES[7]}`, value: dispatched, color: "var(--color-text-primary)" },
    { key: "completed", label: "Completed", sub: "All items delivered", value: completed, color: "#27500A" },
    { key: "overdue", label: "Overdue", sub: "Past expected delivery", value: overdue, color: "#E24B4A" },
  ];

  // Needs-attention counts: number of ORDERS affected by each gate.
  const attentionCount = type => activeOrders.filter(o => meta.get(o.id).attention.some(a => a.type === type)).length;
  const attentionChips = [
    { key: "overdue", label: "Overdue", count: overdue, danger: true, active: statFilter === "overdue",
      onClick: () => setStatFilter(prev => prev === "overdue" ? null : "overdue"),
      hint: "Orders with an undelivered item past its expected delivery date" },
    ...ATTENTION_ORDER.map(type => ({
      key: type, label: ATTENTION_TYPES[type].chip, count: attentionCount(type), danger: false,
      active: attentionFilter === type,
      onClick: () => setAttentionFilter(prev => prev === type ? null : type),
      hint: `Waiting on: ${ATTENTION_TYPES[type].who}`,
    })),
  ];
  const nothingNeedsAttention = attentionChips.every(c => c.count === 0);

  // Filter
  const filtered = activeOrders.filter(o => {
    const m = meta.get(o.id);
    if (channelFilter !== "All" && o.channel !== channelFilter) return false;
    if (stageFilter !== "All" && STAGES[m.stage] !== stageFilter) return false;
    if (search) {
      const q = search.trim().toLowerCase();
      const qDigits = q.replace(/\D/g, "");
      const matchesName = (o.customer.name || "").toLowerCase().includes(q);
      const matchesId = o.id.toLowerCase().includes(q);
      // Only compare phone numbers when the query actually contains digits — otherwise
      // includes("") is always true and every order would match a name search.
      const matchesPhone = qDigits.length > 0 && (o.customer.phone || "").replace(/\D/g, "").includes(qDigits);
      if (!matchesName && !matchesId && !matchesPhone) return false;
    }
    if (statFilter && statFilter !== "total") {
      if (statFilter === "overdue") { if (!m.overdue) return false; }
      else if (stageBucket(m.stage) !== statFilter) return false;
    }
    if (attentionFilter && !m.attention.some(a => a.type === attentionFilter)) return false;
    return true;
  });

  // Sort
  const NO_DATE = 8.64e15;
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "urgency") {
      cmp = meta.get(a.id).score - meta.get(b.id).score;
    } else if (sortBy === "date") {
      cmp = (a.date || "").localeCompare(b.date || "");
    } else if (sortBy === "delivery") {
      const da = latestDeliveryDate(a), db = latestDeliveryDate(b);
      cmp = (da ? da.getTime() : NO_DATE) - (db ? db.getTime() : NO_DATE);
    } else if (sortBy === "value") {
      cmp = (a.value || 0) - (b.value || 0);
    } else if (sortBy === "stage") {
      cmp = meta.get(a.id).stage - meta.get(b.id).stage;
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

  function clearAllFilters() {
    setStatFilter(null); setAttentionFilter(null); setChannelFilter("All"); setStageFilter("All"); setSearch("");
  }

  const activeFilters = [];
  if (statFilter) activeFilters.push({ key: "stat", label: stats.find(s => s.key === statFilter)?.label, clear: () => setStatFilter(null) });
  if (attentionFilter) activeFilters.push({ key: "att", label: `Needs attention: ${ATTENTION_TYPES[attentionFilter].chip}`, clear: () => setAttentionFilter(null) });
  if (channelFilter !== "All") activeFilters.push({ key: "ch", label: `Channel: ${channelFilter}`, clear: () => setChannelFilter("All") });
  if (stageFilter !== "All") activeFilters.push({ key: "st", label: `Stage: ${stageFilter}`, clear: () => setStageFilter("All") });
  if (search) activeFilters.push({ key: "q", label: `Search: "${search}"`, clear: () => setSearch("") });

  const sortArrow = (field) => sortBy === field ? (sortDir === "desc" ? " \u2193" : " \u2191") : "";

  const TH = ({ field, children, style, title }) => (
    <th onClick={() => toggleSort(field)} title={title || "Click to sort"} style={{
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

  const cell = { padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" };

  return (
    <div>
      <style>{`.dash-stat:hover { border-color: var(--color-border-primary) !important; }`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Dashboard</div>
      </div>

      {/* Needs attention */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginRight: 4 }}>Needs attention</div>
          {nothingNeedsAttention ? (
            <div style={{ fontSize: 12, color: "#27500A" }}>Nothing is overdue or blocked right now.</div>
          ) : (
            attentionChips.map(c => {
              const disabled = c.count === 0 && !c.active;
              const palette = c.danger
                ? { bg: "#FCEBEB", fg: "#791F1F", border: "#F09595" }
                : { bg: "#FAEEDA", fg: "#633806", border: "#EF9F27" };
              return (
                <button key={c.key} onClick={disabled ? undefined : c.onClick} disabled={disabled} title={c.hint}
                  style={{
                    fontSize: 12, padding: "5px 11px", borderRadius: 8, fontFamily: "inherit",
                    cursor: disabled ? "default" : "pointer",
                    border: `1px solid ${c.active ? palette.fg : disabled ? "var(--color-border-tertiary)" : palette.border}`,
                    background: disabled ? "transparent" : palette.bg,
                    color: disabled ? "var(--color-text-secondary)" : palette.fg,
                    opacity: disabled ? 0.6 : 1, fontWeight: c.active ? 600 : 500,
                  }}>
                  {c.label} <span style={{ fontWeight: 600 }}>{c.count}</span>
                </button>
              );
            })
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
          Click a count to list those orders. The "Needs attention" column in the table shows what each order is waiting on.
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 10, marginBottom: 6 }}>
        {stats.map(s => {
          const active = statFilter === s.key || (statFilter === null && s.key === "total");
          const activate = () => toggleStatFilter(s.key === "total" ? null : s.key);
          return (
            <div key={s.key} className={active ? "" : "dash-stat"}
              role="button" tabIndex={0} aria-pressed={active}
              title={s.key === "total" ? "Show all active orders" : `Click to show only: ${s.label}`}
              onClick={activate}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
              style={{
                background: active ? "var(--color-background-primary)" : "var(--color-background-secondary)",
                border: `1px solid ${active ? s.color : "var(--color-border-tertiary)"}`,
                borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                transition: "border-color 0.15s",
              }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: s.color }}><CountUp value={s.value} /></div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.3 }}>{s.sub}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 18 }}>
        Click a card to filter the table. Each order is grouped by its least-advanced item.
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, or order ID..."
          style={{ fontSize: 12, padding: "7px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", width: 260, fontFamily: "inherit" }} />
        <div className="filter-chips" style={{ display: "flex", gap: 4 }}>
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
          aria-label="Filter by stage"
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}>
          <option value="All">All stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-secondary)" }}>
          Showing {sorted.length} of {total} order{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Filtered by:</span>
          {activeFilters.map(f => (
            <span key={f.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "3px 4px 3px 10px", borderRadius: 7, background: "var(--color-background-info)", color: "var(--color-text-info)" }}>
              {f.label}
              <button onClick={f.clear} aria-label={`Remove filter ${f.label}`}
                style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 4px", fontFamily: "inherit" }}>{"\u00d7"}</button>
            </span>
          ))}
          <button onClick={clearAllFilters}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-danger)", background: "transparent", color: "var(--color-text-danger)", cursor: "pointer", fontFamily: "inherit" }}>
            Clear all
          </button>
        </div>
      )}

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
              <TH field="stage" title="Sort by stage (least-advanced item)">Stage</TH>
              <TH field="delivery">Exp. delivery</TH>
              {plainTH("Status")}
              <TH field="urgency" title="Sort by urgency: overdue first, then blocked, then nearest delivery">Needs attention</TH>
            </tr>
          </thead>
          <tbody>
            {sorted.map(o => {
              const m = meta.get(o.id);
              const displayStageIdx = m.stage;
              const aheadCount = o.items.filter(i => i.stageIndex > displayStageIdx).length;
              const latest = latestDeliveryDate(o);
              const ds = delayStatus(o);
              const isOverdue = m.overdue;
              const orderIsNew = isNewOrder(o);
              const rowBg = isOverdue ? "#FCEBEB" : orderIsNew ? "#F0FAF0" : "transparent";
              const rowHoverBg = isOverdue ? "#f8d7d7" : orderIsNew ? "#e4f5e4" : "var(--color-background-secondary)";
              const statusKey = isOverdue ? "overdue" : ds === "delayed" ? "delayed" : "on-track";
              return (
                <tr key={o.id} onClick={() => onOrderClick(o.id)}
                  style={{ cursor: "pointer", background: rowBg }}
                  onMouseEnter={e => e.currentTarget.style.background = rowHoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}>
                  <td style={{ ...cell, color: "var(--color-text-secondary)", fontSize: 12 }}>{o.date}</td>
                  <td style={{ ...cell, fontWeight: 500, color: isOverdue ? "#791F1F" : "var(--color-text-info)" }}>
                    {o.id}
                    {orderIsNew && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#27500A", color: "white", fontWeight: 600, marginLeft: 6, letterSpacing: "0.3px", verticalAlign: "middle" }}>NEW</span>}
                  </td>
                  <td style={cell}>
                    <div>{o.customer.name}</div>
                    {o.customer.phone && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{o.customer.phone}</div>}
                  </td>
                  <td style={cell}>
                    <Badge variant={channelVariant(o.channel)}>{o.channel}</Badge>
                  </td>
                  <td style={{ ...cell, fontWeight: 500 }}>{formatCurrency(o.value)}</td>
                  <td style={cell}>
                    <Badge variant={stageVariant(displayStageIdx)}>{STAGES[displayStageIdx]}</Badge>
                    {aheadCount > 0 && (
                      <div title={o.items.map(i => `${i.name || "Item"}: ${STAGES[i.stageIndex]}`).join("\n")}
                        style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 3 }}>
                        {aheadCount} of {o.items.length} items further along
                      </div>
                    )}
                  </td>
                  <td style={{ ...cell, fontSize: 12, color: "var(--color-text-secondary)" }}>{latest ? formatDeliveryDate(latest) : "\u2014"}</td>
                  <td style={{ ...cell, fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <DelayDot status={statusKey} />
                      {isOverdue ? `Overdue \u00b7 ${m.late}d late` : ds === "delayed" ? "Delayed" : "On track"}
                    </div>
                    {isOverdue && ds === "delayed" && (
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2, marginLeft: 13 }}>date was rescheduled</div>
                    )}
                  </td>
                  <td style={cell}>
                    {m.attention.length === 0 ? (
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{"\u2014"}</span>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        {m.attention.map(a => (
                          <span key={a.type}
                            title={`Waiting on: ${a.who}\n${a.itemNames.join(", ")}`}
                            style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: "#FAEEDA", color: "#633806", fontWeight: 500, whiteSpace: "nowrap" }}>
                            {a.label}{a.count > 1 ? ` \u00d7${a.count}` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
            {total === 0 ? (
              "No active orders yet."
            ) : (
              <>
                <div style={{ marginBottom: 10 }}>No orders match these filters.</div>
                <button onClick={clearAllFilters}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" }}>
                  Clear all filters
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
