import { useState, useEffect, useCallback } from "react";
import * as api from "./api";
import PersonOrders from "./PersonOrders";

const inr = n => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
// ₹1,20,000 -> ₹1.2L, ₹2,50,00,000 -> ₹2.5Cr
function short(n) {
  const v = Number(n) || 0;
  if (v >= 10000000) return "₹" + parseFloat((v / 10000000).toFixed(2)) + "Cr";
  if (v >= 100000) return "₹" + parseFloat((v / 100000).toFixed(2)) + "L";
  return inr(v);
}
const plural = (n, one, many) => (n === 1 ? one : many);
const CARD = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16 };
const MUTED = { color: "var(--color-text-secondary)" };
const H = { fontSize: 14, fontWeight: 600, marginBottom: 10 };

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function Tile({ label, value, sub, subColor }) {
  return (
    <div style={{ ...CARD, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 12, ...MUTED }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, marginTop: 3, color: subColor || "var(--color-text-secondary)" }}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, color = "#639922" }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: "var(--color-background-secondary)", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color }} />
    </div>
  );
}

function Row({ left, right, sub, onClick, label }) {
  const click = onClick ? { role: "button", tabIndex: 0, "aria-label": label, onClick, onKeyDown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } } : {};
  return (
    <div {...click} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 13, cursor: onClick ? "pointer" : "default" }}>
      <span style={{ minWidth: 0 }}>{left}{sub && <span style={{ fontSize: 12, ...MUTED }}> {sub}</span>}</span>
      <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{right}</span>
    </div>
  );
}

function Revenue({ r }) {
  const max = Math.max(1, ...r.channels.map(c => c.value));
  return (
    <div style={CARD}>
      <div style={H}>Revenue by channel</div>
      {r.channels.length === 0 && <div style={{ fontSize: 13, ...MUTED }}>No orders this month.</div>}
      {r.channels.map(c => {
        const delta = c.prev > 0 ? Math.round(((c.value - c.prev) / c.prev) * 100) : null;
        return (
          <div key={c.channel} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>{c.channel === "Wholesale" ? "Wholesale (B2B)" : c.channel} <span style={{ fontSize: 12, ...MUTED }}>{c.orders} {plural(c.orders, "order", "orders")}</span></span>
              <span><span style={{ fontWeight: 500 }}>{short(c.value)}</span> <span style={{ fontSize: 12, ...MUTED }}>{c.share !== null ? `${c.share}%` : ""}{delta !== null ? ` · ${delta >= 0 ? "+" : ""}${delta}% vs last month` : ""}</span></span>
            </div>
            <Bar pct={(c.value / max) * 100} color={c.channel === "Wholesale" ? "#B5B2F0" : "#639922"} />
          </div>
        );
      })}
      {r.total > 0 && (
        <div style={{ fontSize: 12, ...MUTED, marginTop: 4 }}>
          {short(r.delivered)} delivered, {short(r.inProgress)} still in progress. Order values include GST.
        </div>
      )}
    </div>
  );
}

function Funnel({ e }) {
  const f = e.funnel;
  const steps = [
    { label: "Enquiries", n: f.enquiries, hint: `${e.walkIns} walk-in, ${e.direct} website and other` },
    { label: "In the pipeline", n: f.inPipeline },
    { label: "Reached negotiation", n: f.negotiationPlus },
    { label: "Won", n: f.won },
  ];
  const top = Math.max(1, f.enquiries, f.inPipeline);
  return (
    <div style={CARD}>
      <div style={H}>Enquiries this month</div>
      {f.enquiries === 0 && f.inPipeline === 0 && <div style={{ fontSize: 13, ...MUTED }}>No visits or enquiries logged this month.</div>}
      {(f.enquiries > 0 || f.inPipeline > 0) && steps.map((s, i) => {
        const prevN = i === 0 ? null : steps[i - 1].n;
        const conv = prevN ? Math.round((s.n / prevN) * 100) : null;
        return (
          <div key={s.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>{s.label}{s.hint && <span style={{ fontSize: 12, ...MUTED }}> ({s.hint})</span>}</span>
              <span><span style={{ fontWeight: 500 }}>{s.n}</span>{conv !== null && <span style={{ fontSize: 12, ...MUTED }}> · {conv}% of previous step</span>}</span>
            </div>
            <Bar pct={(s.n / top) * 100} color={i === 3 ? "#27500A" : "#85B7EB"} />
          </div>
        );
      })}
      {(f.enquiries > 0 || f.inPipeline > 0) && (
        <div style={{ fontSize: 12, ...MUTED }}>
          Counts what started this month. Deals still open haven't won yet, so recent months look low.
          {f.lost > 0 && ` ${f.lost} ${plural(f.lost, "deal", "deals")} lost.`}
          {e.walkInsNotAdded > 0 && ` ${e.walkInsNotAdded} walk-in ${plural(e.walkInsNotAdded, "visit was", "visits were")} never added to the pipeline.`}
        </div>
      )}
    </div>
  );
}

function SourcesAndPeople({ e }) {
  const rate = (w, d) => (d > 0 ? `${Math.round((w / d) * 100)}%` : "–");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      <div style={CARD}>
        <div style={H}>Where deals come from</div>
        {e.bySource.length === 0 && <div style={{ fontSize: 13, ...MUTED }}>No deals started this month.</div>}
        {e.bySource.map(s => <Row key={s.source} left={s.source} sub={`${s.deals} ${plural(s.deals, "deal", "deals")}`} right={`${s.won} won · ${rate(s.won, s.deals)}`} />)}
      </div>
      <div style={CARD}>
        <div style={H}>Deals by salesperson</div>
        {e.byPerson.length === 0 && <div style={{ fontSize: 13, ...MUTED }}>No deals started this month.</div>}
        {e.byPerson.map(p => <Row key={p.name} left={p.name || "Unassigned"} sub={`${p.deals} ${plural(p.deals, "deal", "deals")}`} right={`${p.won} won · ${rate(p.won, p.deals)}`} />)}
      </div>
    </div>
  );
}

function Showroom({ e }) {
  const L = e.levels;
  if (e.walkIns === 0 && e.lostReasons.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
      {e.walkIns > 0 && (
        <div style={CARD}>
          <div style={H}>Showroom visitors</div>
          <Row left="Hot" right={L.Hot} />
          <Row left="Interested" right={L.Interested} />
          <Row left="Browsing" right={L.Browsing} />
          {e.topInterests.length > 0 && <div style={{ fontSize: 12, ...MUTED, marginTop: 8 }}>Most asked about: {e.topInterests.map(i => `${i.name} (${i.count})`).join(", ")}</div>}
        </div>
      )}
      {e.lostReasons.length > 0 && (
        <div style={CARD}>
          <div style={H}>Why deals were lost this month</div>
          {e.lostReasons.map(l => <Row key={l.reason} left={l.reason} right={l.count} />)}
        </div>
      )}
    </div>
  );
}

function Team({ c, onOpenPerson }) {
  return (
    <div style={CARD}>
      <div style={H}>Team and commission</div>
      {c.people.length === 0 && <div style={{ fontSize: 13, ...MUTED }}>No orders counted toward commission.</div>}
      {c.people.map(p => <Row key={p.key} left={p.name} sub={`${short(p.sales)} sold · ${p.rate}% slab`} right={<>{inr(p.commission)} <i className="ti ti-chevron-right" style={{ fontSize: 13, color: "var(--color-text-secondary)", verticalAlign: -2 }} aria-hidden="true" /></>} onClick={() => onOpenPerson(p)} label={`Review ${p.name}'s orders`} />)}
      {c.people.length > 0 && (
        <div style={{ fontSize: 12, ...MUTED, marginTop: 8 }}>
          {inr(c.earned)} earned on delivered orders, {inr(c.pending)} waiting on delivery, {inr(c.paid)} paid.
        </div>
      )}
    </div>
  );
}

export default function Overview({ onOpenPayouts, onOpenPipeline }) {
  const [month, setMonth] = useState(null); // null = this month
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback(() => {
    let live = true;
    setLoading(true); setErr("");
    api.fetchOverview(month)
      .then(d => { if (live) setData(d); })
      .catch(e => { if (live) setErr((e && e.message) || "Couldn't load the overview."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [month]);
  useEffect(() => load(), [load]);

  const shown = data ? data.month : null;
  const isCurrent = data && !data.closed;
  const rev = data && data.revenue;
  const a = data && data.attention;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => shown && setMonth(shiftMonth(shown, -1))} disabled={!shown} aria-label="Previous month" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 6 }}><i className="ti ti-chevron-left" /></button>
        <span style={{ fontSize: 16, fontWeight: 500, minWidth: 150, textAlign: "center" }}>{shown ? monthLabel(shown) : "…"}</span>
        <button onClick={() => shown && setMonth(shiftMonth(shown, 1))} disabled={!shown || isCurrent} aria-label="Next month" style={{ background: "none", border: "none", cursor: !shown || isCurrent ? "default" : "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 6, opacity: !shown || isCurrent ? 0.3 : 1 }}><i className="ti ti-chevron-right" /></button>
        <span style={{ fontSize: 12, ...MUTED, marginLeft: 8 }}>Sales overview{isCurrent ? ", month so far" : ""}</span>
      </div>

      {err && (
        <div role="alert" style={{ fontSize: 13, color: "#C0392B", background: "#FCEBEB", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #f09595", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span><i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{err}</span>
          <button onClick={() => load()} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid #f09595", background: "white", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Retry</button>
        </div>
      )}
      {loading && !data && !err && <div style={{ fontSize: 13, ...MUTED, padding: "24px 0", textAlign: "center" }}>Loading overview…</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: loading ? 0.6 : 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
            <Tile label="Revenue" value={short(rev.total)}
              sub={rev.change === null ? (rev.prevTotal === 0 ? "No orders last month" : "") : `${rev.change >= 0 ? "▲" : "▼"} ${Math.abs(rev.change)}% vs last month (${short(rev.prevTotal)})`}
              subColor={rev.change === null ? undefined : rev.change >= 0 ? "#27500A" : "#791F1F"} />
            <Tile label="Orders" value={rev.orders} sub={rev.orders ? `${short(rev.average)} average` : ""} />
            <Tile label="Enquiries" value={data.enquiries.total} sub={`${data.enquiries.walkIns} walk-in, ${data.enquiries.direct} other`} />
            <Tile label="Commission unpaid" value={short(data.commission.unpaid)} sub={`${short(data.commission.earned)} earned, ${short(data.commission.paid)} paid`} />
          </div>

          {(a.goingCold.count > 0 || data.commission.prevUnpaid > 0 || data.unmatched.length > 0) && (
            <div style={{ ...CARD, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ ...H, marginBottom: 2 }}>Needs attention</div>
              {a.goingCold.count > 0 && (
                <div><i className="ti ti-clock-exclamation" style={{ fontSize: 15, verticalAlign: -3, marginRight: 6, color: "#633806" }} aria-hidden="true" />
                  {a.goingCold.count} open {plural(a.goingCold.count, "deal", "deals")} ({short(a.goingCold.value)}) with no contact in {a.goingCold.days}+ days.
                  {onOpenPipeline && <button onClick={onOpenPipeline} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--color-text-info)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}>Open pipeline</button>}</div>
              )}
              {data.commission.prevUnpaid > 0 && (
                <div><i className="ti ti-cash" style={{ fontSize: 15, verticalAlign: -3, marginRight: 6, color: "#633806" }} aria-hidden="true" />
                  {short(data.commission.prevUnpaid)} of {monthLabel(data.prev)} commission is earned but not paid.
                  {onOpenPayouts && <button onClick={onOpenPayouts} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--color-text-info)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: 0 }}>Open payouts</button>}</div>
              )}
              {data.unmatched.length > 0 && (
                <div><i className="ti ti-alert-triangle" style={{ fontSize: 15, verticalAlign: -3, marginRight: 6, color: "#633806" }} aria-hidden="true" />
                  {data.unmatched.map((u, i) => <span key={u.name}>{i > 0 ? ", " : ""}"{u.name}" ({u.orders} {plural(u.orders, "order", "orders")})</span>)} {plural(data.unmatched.length, "isn't", "aren't")} a user, so no one earns commission on {plural(data.unmatched.reduce((s, u) => s + u.orders, 0), "it", "them")}.</div>
              )}
            </div>
          )}

          <Revenue r={rev} />
          <Team c={data.commission} onOpenPerson={setReviewing} />
          <Funnel e={data.enquiries} />
          <SourcesAndPeople e={data.enquiries} />
          <Showroom e={data.enquiries} />

          <div style={{ fontSize: 11, ...MUTED }}>
            Open pipeline: {a.openDeals} {plural(a.openDeals, "deal", "deals")}, {short(a.openValue)} estimated, of which {short(a.negotiationValue)} in negotiation.
          </div>
        </div>
      )}
      {reviewing && data && <PersonOrders month={data.month} person={reviewing} onClose={() => setReviewing(null)} onChanged={() => load()} />}
    </div>
  );
}
