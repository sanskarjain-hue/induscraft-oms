import { useState, useEffect, useCallback } from "react";
import * as api from "./api";
import PersonOrders from "./PersonOrders";

// ── formatting ────────────────────────────────────────────
const inr = n => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
// 715000 -> "7.15L", 1000000 -> "10L", 285000 -> "2.85L"
const lakh = n => `${parseFloat((n / 100000).toFixed(2))}L`;
const money = n => (n >= 100000 ? "₹" + lakh(n) : inr(n));
const plural = (n, one, many) => (n === 1 ? one : many);

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

const CARD = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16 };
const MUTED = { color: "var(--color-text-secondary)" };

function Chip({ bg, fg, children }) {
  return <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 6, background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
}

// ── the meter ─────────────────────────────────────────────
function Meter({ me, prev, config, calendar, title, showTitle }) {
  const slabs = config.slabs;
  const max = slabs[slabs.length - 1].from;
  const pct = v => Math.max(0, Math.min(100, (v / max) * 100));
  const deliveredPct = pct(me.deliveredSales);
  const soldPct = pct(me.sales);
  const prevShown = prev && prev.sales > 0 && prev.sales < max;
  const empty = me.orderCount === 0;

  const summary = `${money(me.sales)} sold of ${money(max)} for the top slab. ${money(me.deliveredSales)} delivered.`;

  return (
    <div style={CARD}>
      {showTitle && <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{title}</div>}
      <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1.1 }}>{inr(me.commission)}</div>
      <div style={{ fontSize: 13, ...MUTED, marginTop: 2 }}>commission {calendar.isCurrent ? "this month" : "that month"}</div>

      {me.payouts && me.payouts.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#27500A" }}>
          <i className="ti ti-circle-check" style={{ fontSize: 15, verticalAlign: -3, marginRight: 4 }} aria-hidden="true" />
          {inr(me.payouts.reduce((s, p) => s + p.amount, 0))} paid
          {me.payouts.length === 1 ? ` on ${new Date(me.payouts[0].paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ` in ${me.payouts.length} payments`}
        </div>
      )}

      {!empty && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          <Chip bg="#EAF3DE" fg="#27500A">{inr(me.earned)} earned</Chip>
          {me.pending > 0 && <Chip bg="#FAEEDA" fg="#633806">{inr(me.pending)} waiting on delivery</Chip>}
        </div>
      )}

      <div role="img" aria-label={summary} style={{ position: "relative", height: 62, marginTop: 18 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 14, height: 14, borderRadius: 7, background: "var(--color-background-secondary)" }} />
        {deliveredPct > 0 && <div style={{ position: "absolute", left: 0, width: `${deliveredPct}%`, top: 14, height: 14, borderRadius: deliveredPct >= 99.5 ? 7 : "7px 0 0 7px", background: "#639922" }} />}
        {soldPct > deliveredPct && (
          <div style={{ position: "absolute", left: `${deliveredPct}%`, width: `${soldPct - deliveredPct}%`, top: 14, height: 14, background: "#FAEEDA", border: "0.5px solid #EF9F27", borderLeft: deliveredPct > 0 ? "none" : undefined, borderRadius: `${deliveredPct > 0 ? 0 : 7}px ${soldPct >= 99.5 ? 7 : 0}px ${soldPct >= 99.5 ? 7 : 0}px ${deliveredPct > 0 ? 0 : 7}px`, boxSizing: "border-box" }} />
        )}
        {prevShown && calendar.isCurrent && (
          <div style={{ position: "absolute", left: `${pct(prev.sales)}%`, top: 0, transform: "translateX(-50%)", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1 }}>last month</div>
            <i className="ti ti-caret-down" style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1 }} aria-hidden="true" />
          </div>
        )}
        {slabs.map((s, i) => {
          const left = pct(s.from);
          const last = left >= 95;
          return (
            <div key={s.from}>
              <div style={{ position: "absolute", left: last ? undefined : `${left}%`, right: last ? 0 : undefined, top: 10, width: 1, height: 22, background: "var(--color-border-primary)" }} />
              <div style={{ position: "absolute", left: last ? undefined : `${left}%`, right: last ? 0 : undefined, top: 36, transform: last ? undefined : "translateX(-50%)", textAlign: last ? "right" : "center", fontSize: 11, lineHeight: 1.3, color: "var(--color-text-secondary)" }}>
                {lakh(s.from)}<br /><span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{s.rate}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>
        {empty
          ? (calendar.isCurrent ? "No orders yet this month. Your first order starts the meter." : "No orders that month.")
          : `${money(me.sales)} sold${me.deliveredSales > 0 ? `: ${money(me.deliveredSales)} delivered` : ""}${me.sales - me.deliveredSales > 0 ? `${me.deliveredSales > 0 ? "," : ":"} ${money(me.sales - me.deliveredSales)} in progress` : ""}`}
      </div>

      {calendar.isCurrent && me.next && !empty && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#E6F1FB" }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#0C447C" }}>
            <i className="ti ti-arrow-up-right" style={{ fontSize: 16, verticalAlign: -3, marginRight: 4 }} aria-hidden="true" />
            {money(me.next.remaining)} more {me.rate === 0 ? `starts your commission at ${me.next.rate}%` : `takes you to ${me.next.rate}%`}
          </div>
          <div style={{ fontSize: 13, color: "#0C447C", marginTop: 3 }}>
            +{inr(me.next.jump)} the moment you cross, because {me.next.rate}% applies to everything you've sold.
            {calendar.daysLeft > 0 && <> About {inr(Math.ceil(me.next.remaining / calendar.daysLeft / 100) * 100)} a day for {calendar.daysLeft} {plural(calendar.daysLeft, "day", "days")}.</>}
          </div>
        </div>
      )}
      {calendar.isCurrent && me.next && empty && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#E6F1FB", fontSize: 13, color: "#0C447C" }}>
          Reach {money(me.next.from)} in sales to start earning {me.next.rate}% on everything you've sold.
        </div>
      )}
      {!me.next && !empty && (
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#EAF3DE", fontSize: 13, color: "#27500A", fontWeight: 500 }}>
          <i className="ti ti-trophy" style={{ fontSize: 16, verticalAlign: -3, marginRight: 4 }} aria-hidden="true" />
          Top slab: {me.rate}% on everything {calendar.isCurrent ? "this month" : "that month"}.
        </div>
      )}
    </div>
  );
}

function PipelineCards({ pipeline, onOpenPipeline }) {
  const n = pipeline.negotiation, c = pipeline.goingCold;
  const TILE = { ...CARD, padding: 12, minWidth: 0 };
  const LABEL = { fontSize: 12, ...MUTED };
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={TILE}>
          <div style={LABEL}><i className="ti ti-target-arrow" style={{ fontSize: 15, verticalAlign: -3, marginRight: 3 }} aria-hidden="true" />In negotiation</div>
          {n.count === 0 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>No deals yet</div>
              <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>Move a warm deal forward to see what it's worth.</div>
            </>
          ) : n.value === 0 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>{n.count} {plural(n.count, "deal", "deals")}</div>
              <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>Add an estimated value to see what {plural(n.count, "it's", "they're")} worth.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>+{inr(n.gain)}</div>
              <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>
                if your {money(n.value)} {plural(n.count, "deal closes", `${n.count} deals close`)}.{n.crossesSlab ? ` It lifts you to ${n.newRate}%.` : ""}
              </div>
            </>
          )}
        </div>
        <div style={TILE}>
          <div style={LABEL}><i className="ti ti-clock-exclamation" style={{ fontSize: 15, verticalAlign: -3, marginRight: 3 }} aria-hidden="true" />Going cold</div>
          {c.count === 0 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 500, marginTop: 4 }}>All caught up</div>
              <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>Nothing untouched for {c.days}+ days.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>{c.count} {plural(c.count, "deal", "deals")}</div>
              <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>{c.value > 0 ? `${money(c.value)}, ` : ""}no contact in {c.days}+ days. Call today.</div>
            </>
          )}
        </div>
      </div>
      {onOpenPipeline && (
        <button onClick={onOpenPipeline} style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-info)", fontSize: 13, fontFamily: "inherit", padding: 0 }}>
          Open pipeline <i className="ti ti-arrow-right" style={{ fontSize: 13, verticalAlign: -2 }} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

function OrdersCard({ me, rate }) {
  if (!me.orders || me.orders.length === 0) return null;
  return (
    <div style={{ ...CARD, padding: "4px 16px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, padding: "12px 0 6px" }}>Your orders ({me.orders.length})</div>
      {me.orders.map(o => (
        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.customer || "Customer"}</div>
            <div style={{ fontSize: 12, ...MUTED }}>{o.id} · {money(o.value)}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{o.commission > 0 ? inr(o.commission) : "—"}</div>
            {o.delivered
              ? <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 6, background: "#EAF3DE", color: "#27500A" }}>Delivered</span>
              : <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 6, background: "#FAEEDA", color: "#633806" }}>In progress</span>}
            {o.underReview && <span style={{ marginLeft: 4, fontSize: 11, padding: "1px 7px", borderRadius: 6, background: "#FCEBEB", color: "#791F1F" }}>Under review</span>}
          </div>
        </div>
      ))}
      {rate === 0 && <div style={{ fontSize: 11, ...MUTED, padding: "0 0 10px" }}>Commission shows once you pass the first slab.</div>}
    </div>
  );
}

function TeamCard({ people, unmatched, monthName, onOpenPerson }) {
  return (
    <div style={{ ...CARD, padding: "4px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 6px", fontSize: 13, fontWeight: 600 }}>
        <span>Team, {monthName}</span><span style={{ fontWeight: 400, ...MUTED }}>commission</span>
      </div>
      {people.length === 0 && <div style={{ fontSize: 13, ...MUTED, padding: "10px 0 14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>No orders that count toward commission this month.</div>}
      {people.map(p => (
        <div key={p.key} role="button" tabIndex={0} aria-label={`Review ${p.name}'s orders`} onClick={() => onOpenPerson(p)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenPerson(p); } }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>{p.name}{p.flagged > 0 && <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 7px", borderRadius: 6, background: "#FCEBEB", color: "#791F1F" }}>{p.flagged} flagged</span>}</div>
            <div style={{ fontSize: 12, ...MUTED }}>
              {money(p.sales)} sold · {p.rate}%{p.next ? ` · ${money(p.next.remaining)} to next slab` : " · top slab"}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{inr(p.commission)}</div>
            <div style={{ fontSize: 11, ...MUTED }}>{p.prev && p.prev.sales > 0 ? `last month ${money(p.prev.sales)}` : "no sales last month"}</div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 14, color: "var(--color-text-secondary)" }} aria-hidden="true" />
        </div>
      ))}
      {unmatched && unmatched.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 0 12px", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "#633806" }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
          <span>
            {unmatched.map((u, i) => <span key={u.name}>{i > 0 ? ", " : ""}"{u.name}" ({u.orders} {plural(u.orders, "order", "orders")})</span>)}
            {" "}{plural(unmatched.length, "isn't", "aren't")} a user, so no one is earning commission on {plural(unmatched.reduce((s, u) => s + u.orders, 0), "that order", "those orders")}. Fix the salesperson on the order.
          </span>
        </div>
      )}
    </div>
  );
}

// ── page ──────────────────────────────────────────────────
export default function MySales({ role, onOpenPipeline }) {
  const [month, setMonth] = useState(null); // null = this month (the server decides what that is)
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(() => {
    let live = true;
    setLoading(true); setErr("");
    api.fetchCommission(month)
      .then(d => { if (live) setData(d); })
      .catch(e => { if (live) setErr((e && e.message) || "Couldn't load your sales."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [month]);

  useEffect(() => load(), [load]);

  const shown = data ? data.month : null;
  const isAdmin = role === "admin";
  const showOwn = data && (!isAdmin || data.me.orderCount > 0);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => shown && setMonth(shiftMonth(shown, -1))} disabled={!shown} aria-label="Previous month"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 6 }}><i className="ti ti-chevron-left" /></button>
          <span style={{ fontSize: 16, fontWeight: 500, minWidth: 130, textAlign: "center" }}>{shown ? monthLabel(shown) : "…"}</span>
          <button onClick={() => shown && setMonth(shiftMonth(shown, 1))} disabled={!shown || data.calendar.isCurrent} aria-label="Next month"
            style={{ background: "none", border: "none", cursor: !shown || data.calendar.isCurrent ? "default" : "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 6, opacity: !shown || data.calendar.isCurrent ? 0.3 : 1 }}><i className="ti ti-chevron-right" /></button>
        </div>
        {data && data.calendar.isCurrent && <span style={{ fontSize: 12, ...MUTED }}>{data.calendar.daysLeft} {plural(data.calendar.daysLeft, "day", "days")} left</span>}
      </div>

      {err && (
        <div role="alert" style={{ fontSize: 13, color: "#C0392B", background: "#FCEBEB", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #f09595", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span><i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{err}</span>
          <button onClick={() => load()} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid #f09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
        </div>
      )}
      {loading && !data && !err && <div style={{ fontSize: 13, ...MUTED, padding: "24px 0", textAlign: "center" }}>Loading your sales…</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: loading ? 0.6 : 1 }}>
          {isAdmin && <TeamCard people={data.people || []} unmatched={data.unmatched} monthName={monthLabel(data.month)} onOpenPerson={setReviewing} />}
          {showOwn && (
            <>
              <Meter me={data.me} prev={data.prev} config={data.config} calendar={data.calendar} title="Your meter" showTitle={isAdmin} />
              {data.pipeline && <PipelineCards pipeline={data.pipeline} onOpenPipeline={onOpenPipeline} />}
              <OrdersCard me={data.me} rate={data.me.rate} />
            </>
          )}
          <div style={{ fontSize: 11, ...MUTED, padding: "2px 2px 0" }}>
            Based on order value including GST (×{data.config.gstFactor} for commission). Earned means every item on the order is delivered. Wholesale orders don't count.
          </div>
        </div>
      )}
      {reviewing && data && <PersonOrders month={data.month} person={reviewing} onClose={() => setReviewing(null)} onChanged={() => load()} />}
    </div>
  );
}
