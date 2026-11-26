import { useState, useEffect, useCallback } from "react";
import * as api from "./api";
import PersonOrders from "./PersonOrders";

const inr = n => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const plural = (n, one, many) => (n === 1 ? one : many);
const CARD = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12 };
const MUTED = { color: "var(--color-text-secondary)" };
const BTN = { fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" };
const INPUT = { width: "100%", boxSizing: "border-box", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" };

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
const shortDate = d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Tile({ label, value, color }) {
  return (
    <div style={{ ...CARD, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 12, ...MUTED }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, marginTop: 3, color: color || "var(--color-text-primary)" }}>{value}</div>
    </div>
  );
}

function PersonRow({ p: row, month, closed, busy, onPay, onVoid, onReview }) {
  const p = { ...row, held: row.held || { amount: 0, count: 0 } };
  const [mode, setMode] = useState(null); // null | "pay" | { voidId }
  const [showOrders, setShowOrders] = useState(false);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const canPay = closed && p.payable.amount > 0;

  async function confirmPay() { const done = await onPay(p, reference.trim()); if (done) { setMode(null); setReference(""); } }
  async function confirmVoid(id) { const done = await onVoid(id, reason.trim()); if (done) { setMode(null); setReason(""); } }

  return (
    <div role="group" aria-label={p.name} style={{ padding: "14px 16px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <button onClick={() => onReview(p)} aria-label={`Review ${p.name}'s orders`} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "inherit", textAlign: "left" }}>{p.name} <i className="ti ti-chevron-right" style={{ fontSize: 13, color: "var(--color-text-secondary)", verticalAlign: -2 }} aria-hidden="true" /></button>
          <div style={{ fontSize: 12, ...MUTED, marginTop: 2 }}>{inr(p.sales)} sold · {p.rate}% slab · {p.orderCount} {plural(p.orderCount, "order", "orders")}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{inr(p.payable.amount)}</div>
          <div style={{ fontSize: 11, ...MUTED }}>to pay now</div>
        </div>
      </div>

      {(p.waiting.amount > 0 || p.paid.amount > 0 || p.held.count > 0) && (
        <div style={{ fontSize: 12, marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap" }}>
          {p.held.count > 0 && <span style={{ color: "#791F1F" }}>{inr(p.held.amount)} on hold ({p.held.count} flagged {plural(p.held.count, "order", "orders")})</span>}
          {p.waiting.amount > 0 && <span style={{ color: "#633806" }}>{inr(p.waiting.amount)} waiting on {p.waiting.count} {plural(p.waiting.count, "delivery", "deliveries")}</span>}
          {p.paid.amount > 0 && <span style={{ color: "#27500A" }}>{inr(p.paid.amount)} paid</span>}
        </div>
      )}

      {p.paid.payouts.map(x => (
        <div key={x.id} style={{ fontSize: 12, ...MUTED, marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span>Payment {x.batch}: {inr(x.amount)} on {shortDate(x.paidAt)} by {x.paidBy}{x.reference ? `, ref ${x.reference}` : ""} ({x.orderCount} {plural(x.orderCount, "order", "orders")})</span>
          <button onClick={() => setMode({ voidId: x.id })} aria-label={`Void payment ${x.batch}`} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#791F1F", fontFamily: "inherit", padding: 0 }}>Void</button>
        </div>
      ))}

      {mode && mode.voidId && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#FCEBEB", border: "0.5px solid #F09595" }}>
          <div style={{ fontSize: 12, color: "#791F1F", fontWeight: 500, marginBottom: 6 }}>Void this payment? Its orders become payable again. The record stays on file.</div>
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={200} placeholder="Reason (optional)" aria-label="Void reason" style={INPUT} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => confirmVoid(mode.voidId)} disabled={busy} style={{ ...BTN, background: "#C0392B", borderColor: "#C0392B", color: "white" }}>Void payment</button>
            <button onClick={() => setMode(null)} style={BTN}>Keep it</button>
          </div>
        </div>
      )}

      {canPay && mode !== "pay" && !(mode && mode.voidId) && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setMode("pay")} disabled={busy} style={{ ...BTN, background: "#27500A", borderColor: "#27500A", color: "white", fontWeight: 500 }}>Mark paid</button>
          <button onClick={() => setShowOrders(s => !s)} aria-expanded={showOrders} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, ...MUTED, fontFamily: "inherit", padding: 0 }}>
            {p.payable.orders.length} {plural(p.payable.orders.length, "order", "orders")} {showOrders ? "▾" : "▸"}
          </button>
        </div>
      )}
      {!canPay && p.payable.amount === 0 && closed && p.paid.amount > 0 && p.waiting.amount === 0 && p.held.count === 0 && (
        <div style={{ fontSize: 12, color: "#27500A", marginTop: 8 }}>Fully paid.</div>
      )}

      {showOrders && (
        <div style={{ marginTop: 8 }}>
          {p.payable.orders.map(o => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", ...MUTED }}>
              <span>{o.customer || "Customer"} · {o.id} · {inr(o.value)}</span><span>{inr(o.commission)}</span>
            </div>
          ))}
        </div>
      )}

      {mode === "pay" && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--color-background-secondary)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Pay {p.name} {inr(p.payable.amount)} for {p.payable.orders.length} {plural(p.payable.orders.length, "order", "orders")}?</div>
          <input value={reference} onChange={e => setReference(e.target.value)} maxLength={200} placeholder="Payment reference (optional)" aria-label="Payment reference" style={INPUT} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={confirmPay} disabled={busy} style={{ ...BTN, background: "#27500A", borderColor: "#27500A", color: "white", fontWeight: 500 }}>{busy ? "Saving…" : `Confirm ${inr(p.payable.amount)} paid`}</button>
            <button onClick={() => setMode(null)} disabled={busy} style={BTN}>Cancel</button>
          </div>
          <div style={{ fontSize: 11, ...MUTED, marginTop: 6 }}>This only records the payment. It doesn't move any money.</div>
        </div>
      )}
    </div>
  );
}

export default function Payouts() {
  const [month, setMonth] = useState(null); // null = let the server pick last month
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(null);

  const load = useCallback((m = month) => {
    setLoading(true); setErr("");
    return api.fetchPayouts(m)
      .then(d => { setData(d); return d; })
      .catch(e => { setErr((e && e.message) || "Couldn't load payouts."); })
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { load(month); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onPay(p, reference) {
    if (busy) return false;
    setBusy(true); setErr(""); setNotice("");
    try {
      await api.recordPayout({ month: data.month, key: p.key, expectedAmount: p.payable.amount, reference });
      setNotice(`Recorded ${inr(p.payable.amount)} paid to ${p.name}.`);
      await load(data.month);
      return true;
    } catch (e) {
      await load(data.month); // the figure may have moved; show the current one (this clears old messages)
      setErr((e && e.message) || "Couldn't record the payment. Nothing was saved.");
      return false;
    } finally { setBusy(false); }
  }

  async function onVoid(id, reason) {
    if (busy) return false;
    setBusy(true); setErr(""); setNotice("");
    try {
      await api.voidPayout(id, reason);
      setNotice("Payment voided. Its orders are payable again.");
      await load(data.month);
      return true;
    } catch (e) {
      setErr((e && e.message) || "Couldn't void the payment.");
      return false;
    } finally { setBusy(false); }
  }

  const shown = data ? data.month : null;
  const atCurrent = data && data.month >= data.currentMonth;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={() => shown && setMonth(shiftMonth(shown, -1))} disabled={!shown} aria-label="Previous month" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 6 }}><i className="ti ti-chevron-left" /></button>
        <span style={{ fontSize: 16, fontWeight: 500, minWidth: 150, textAlign: "center" }}>{shown ? monthLabel(shown) : "…"}</span>
        <button onClick={() => shown && setMonth(shiftMonth(shown, 1))} disabled={!shown || atCurrent} aria-label="Next month" style={{ background: "none", border: "none", cursor: !shown || atCurrent ? "default" : "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 6, opacity: !shown || atCurrent ? 0.3 : 1 }}><i className="ti ti-chevron-right" /></button>
        <span style={{ fontSize: 12, ...MUTED, marginLeft: 8 }}>Commission payouts</span>
      </div>

      {err && <div role="alert" style={{ fontSize: 13, color: "#C0392B", background: "#FCEBEB", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #f09595" }}><i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{err}</div>}
      {notice && <div role="status" style={{ fontSize: 13, color: "#27500A", background: "#EAF3DE", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #97C459" }}>{notice}</div>}
      {loading && !data && !err && <div style={{ fontSize: 13, ...MUTED, padding: "24px 0", textAlign: "center" }}>Loading payouts…</div>}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: loading ? 0.6 : 1 }}>
          {!data.closed && (
            <div style={{ fontSize: 13, padding: "10px 12px", borderRadius: 8, background: "#E6F1FB", color: "#0C447C" }}>
              {monthLabel(data.month)} isn't over yet, so nothing can be paid. Payouts open once the month ends. These are the figures so far.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Tile label={data.closed ? "To pay now" : "Payable so far"} value={inr(data.totals.payable)} />
            <Tile label="Waiting on delivery" value={inr(data.totals.waiting)} color="#633806" />
            <Tile label="Paid" value={inr(data.totals.paid)} color="#27500A" />
            {data.totals.held > 0 && <Tile label="On hold" value={inr(data.totals.held)} color="#791F1F" />}
          </div>

          {data.unmatched && data.unmatched.length > 0 && (
            <div style={{ fontSize: 12, color: "#633806", display: "flex", gap: 8 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
              <span>{data.unmatched.map((u, i) => <span key={u.name}>{i > 0 ? ", " : ""}"{u.name}" ({u.orders} {plural(u.orders, "order", "orders")})</span>)} {plural(data.unmatched.length, "isn't", "aren't")} a user. Fix the salesperson on the order before paying.</span>
            </div>
          )}

          <div style={{ ...CARD, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>Team, {monthLabel(data.month)}</div>
            {data.people.length === 0
              ? <div style={{ padding: "16px", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 13, ...MUTED }}>No orders counted toward commission this month.</div>
              : data.people.map(p => <PersonRow key={p.key} p={p} month={data.month} closed={data.closed} busy={busy} onPay={onPay} onVoid={onVoid} onReview={setReviewing} />)}
          </div>

          <div style={{ fontSize: 11, ...MUTED }}>
            Pays delivered orders at the month's final rate. Orders delivered after a payment go into the next payment at the same rate. Wholesale doesn't count.
          </div>
        </div>
      )}
      {reviewing && data && <PersonOrders month={data.month} person={reviewing} onClose={() => setReviewing(null)} onChanged={() => load(data.month)} />}
    </div>
  );
}
