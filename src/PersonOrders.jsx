import { useState, useEffect, useCallback } from "react";
import * as api from "./api";

const inr = n => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const MUTED = { color: "var(--color-text-secondary)" };
const BTN = { fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" };
const INPUT = { width: "100%", boxSizing: "border-box", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" };

const STATUS = {
  paid:    { label: "Paid",                bg: "#EAF3DE", fg: "#27500A" },
  payable: { label: "Ready to pay",        bg: "#E6F1FB", fg: "#0C447C" },
  held:    { label: "On hold",             bg: "#FCEBEB", fg: "#791F1F" },
  waiting: { label: "Waiting on delivery", bg: "#FAEEDA", fg: "#633806" },
  none:    { label: "Below first slab",    bg: "var(--color-background-secondary)", fg: "var(--color-text-secondary)" },
};

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
const shortDate = d => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");

function OrderRow({ o, busy, onFlag, onClear }) {
  const [mode, setMode] = useState(null); // null | "flag" | "clear"
  const [text, setText] = useState("");
  const s = STATUS[o.status] || STATUS.none;
  const flagged = !!o.flag;

  async function submit() {
    const ok = mode === "flag" ? await onFlag(o, text) : await onClear(o, text);
    if (ok) { setMode(null); setText(""); }
  }

  return (
    <div role="group" aria-label={o.id} style={{ padding: "12px 0", borderTop: "0.5px solid var(--color-border-tertiary)", borderLeft: flagged ? "3px solid #E24B4A" : "3px solid transparent", paddingLeft: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14 }}>{o.customer || "Customer"}</div>
          <div style={{ fontSize: 12, ...MUTED }}>{o.id} · {o.channel}{o.date ? ` · ${shortDate(o.date)}` : ""} · order {inr(o.value)}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{o.commission > 0 ? inr(o.commission) : "—"}</div>
          <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 6, background: s.bg, color: s.fg }}>{s.label}</span>
        </div>
      </div>

      {flagged && (
        <div style={{ marginTop: 8, fontSize: 12, padding: "8px 10px", borderRadius: 8, background: "#FCEBEB", color: "#791F1F" }}>
          <i className="ti ti-flag" style={{ marginRight: 5 }} aria-hidden="true" />
          Flagged{o.flag.by ? ` by ${o.flag.by}` : ""}{o.flag.at ? ` on ${shortDate(o.flag.at)}` : ""}: {o.flag.reason || "no reason given"}
          {o.status === "held" && <div style={{ marginTop: 2 }}>Held out of payouts until you clear it.</div>}
        </div>
      )}

      {mode === null && (
        <div style={{ marginTop: 8 }}>
          {flagged
            ? <button onClick={() => setMode("clear")} disabled={busy} style={BTN}>Clear flag</button>
            : <button onClick={() => setMode("flag")} disabled={busy} style={BTN}><i className="ti ti-flag" style={{ marginRight: 4 }} aria-hidden="true" />Flag for review</button>}
        </div>
      )}
      {mode && (
        <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "var(--color-background-secondary)" }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>
            {mode === "flag" ? "Why does this order need a second look? Its commission is held out of payouts until you clear the flag." : "Clearing makes this order payable again."}
          </div>
          <input value={text} onChange={e => setText(e.target.value)} maxLength={300} aria-label={mode === "flag" ? "Reason" : "Note"} placeholder={mode === "flag" ? "Reason (required)" : "Note (optional)"} style={INPUT} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={submit} disabled={busy || (mode === "flag" && text.trim().length < 3)} style={{ ...BTN, background: mode === "flag" ? "#C0392B" : "#27500A", borderColor: mode === "flag" ? "#C0392B" : "#27500A", color: "white", opacity: busy || (mode === "flag" && text.trim().length < 3) ? 0.6 : 1 }}>
              {mode === "flag" ? "Flag order" : "Clear flag"}
            </button>
            <button onClick={() => { setMode(null); setText(""); }} disabled={busy} style={BTN}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Admin: every order behind one person's commission for a month, with a way to flag any of them.
// onChanged() lets the screen underneath refresh (a flag changes what can be paid).
export default function PersonOrders({ month, person, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api.fetchPersonOrders(month, person.key)
      .then(d => { setData(d); setErr(""); })
      .catch(e => setErr((e && e.message) || "Couldn't load this person's orders."));
  }, [month, person.key]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function act(fn) {
    if (busy) return false;
    setBusy(true); setErr("");
    try { await fn(); await load(); if (onChanged) onChanged(); return true; }
    catch (e) { setErr((e && e.message) || "That didn't save. Nothing was changed."); return false; }
    finally { setBusy(false); }
  }
  const onFlag = (o, reason) => act(() => api.flagOrder(o.id, reason.trim()));
  const onClear = (o, note) => act(() => api.clearFlag(o.id, note.trim()));

  const flaggedCount = data ? data.orders.filter(o => o.flag).length : 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-label={`${person.name} orders`} onClick={e => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "16px 22px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{person.name}</div>
            <div style={{ fontSize: 12, ...MUTED }}>{monthLabel(month)}: orders earning commission</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20 }}><i className="ti ti-x" /></button>
        </div>

        <div style={{ overflowY: "auto", padding: "14px 22px 20px" }}>
          {err && <div role="alert" style={{ fontSize: 13, color: "#C0392B", background: "#FCEBEB", padding: "8px 12px", borderRadius: 8, border: "0.5px solid #f09595", marginBottom: 10 }}>{err}</div>}
          {!data && !err && <div style={{ fontSize: 13, ...MUTED, padding: "20px 0", textAlign: "center" }}>Loading orders…</div>}
          {data && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10 }}>
                {[["Sales", inr(data.sales)], ["Slab", `${data.rate}%`], ["Commission", inr(data.commission)], ["Ready to pay", inr(data.payable)], ["On hold", inr(data.held)], ["Paid", inr(data.paid)]].map(([l, v]) => (
                  <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 11, ...MUTED }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, ...MUTED, marginBottom: 4 }}>
                Commission is {data.rate}% of each order's value × 0.82, because every order counts at the month's slab. {flaggedCount > 0 ? `${flaggedCount} flagged.` : "Flag anything that looks wrong and it won't be paid until you clear it."}
              </div>
              {data.orders.map(o => <OrderRow key={o.id} o={o} busy={busy} onFlag={onFlag} onClear={onClear} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
