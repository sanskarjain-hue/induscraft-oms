import { useState } from "react";
import * as api from "./api";
import { formatCurrency } from "./ui";
import { followUpState, dueLabel, todayStr, addDays } from "./followUp";

const LOST_REASONS = ["Price", "Bought elsewhere", "Still planning", "No response", "Budget cut", "Other"];
const CHIPS = [{ days: 1, label: "Tomorrow" }, { days: 3, label: "3 days" }, { days: 7, label: "1 week" }];

const MUTED = { color: "var(--color-text-secondary)" };
const BTN = { fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: "inherit" };

function daysSince(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr);
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((new Date() - t) / 86400000));
}

function Tag({ children, bg = "var(--color-background-secondary)", fg = "var(--color-text-secondary)" }) {
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
}

function friendlyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function DealCard({ deal, state, role, busy, onOpen, onCall }) {
  const [panel, setPanel] = useState(false);
  const [lostStep, setLostStep] = useState(false);
  const [note, setNote] = useState("");
  const cold = daysSince(deal.lastContacted);
  const overdue = state.overdueDays > 0;
  const source = deal.source || deal.channel;

  function send(payload) { onCall(deal, { ...payload, ...(note.trim() ? { note: note.trim() } : {}) }); }

  return (
    <div role="group" aria-label={deal.customerName}
      style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 14px", opacity: busy ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <button onClick={() => onOpen(deal)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "inherit", textAlign: "left" }}>{deal.customerName}</button>
        {deal.estimatedValue ? <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-info)", whiteSpace: "nowrap" }}>{formatCurrency(deal.estimatedValue)}</span> : null}
      </div>
      {deal.enquiry && <div style={{ fontSize: 12, ...MUTED, marginTop: 3, lineHeight: 1.4 }}>{deal.enquiry.slice(0, 80)}{deal.enquiry.length > 80 ? "…" : ""}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <Tag bg={overdue ? "#FAEEDA" : "var(--color-background-secondary)"} fg={overdue ? "#633806" : "var(--color-text-secondary)"}>{dueLabel(state)}</Tag>
        {source && <Tag>{source}</Tag>}
        <Tag>{deal.stage}</Tag>
        {cold !== null && <Tag>{cold === 0 ? "Contacted today" : `Last contact ${cold}d ago`}</Tag>}
        {role === "admin" && deal.salesperson && <Tag>{deal.salesperson}</Tag>}
      </div>

      {!panel && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
          <button onClick={() => setPanel(true)} disabled={busy} style={{ ...BTN, background: "#27500A", borderColor: "#27500A", color: "white", fontWeight: 500 }}>Called ✓</button>
          {deal.customerPhone && <a href={`tel:${deal.customerPhone.replace(/[^\d+]/g, "")}`} style={{ ...BTN, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}><i className="ti ti-phone" style={{ fontSize: 14 }} aria-hidden="true" />{deal.customerPhone}</a>}
          <button onClick={() => onOpen(deal)} style={{ ...BTN, marginLeft: "auto", color: "var(--color-text-secondary)" }}>Open</button>
        </div>
      )}

      {panel && !lostStep && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "var(--color-background-secondary)" }}>
          <div style={{ fontSize: 12, ...MUTED, marginBottom: 8 }}>Next follow-up</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CHIPS.map(c => <button key={c.days} disabled={busy} onClick={() => send({ days: c.days })} style={BTN}>{c.label}</button>)}
            <button disabled={busy} onClick={() => setLostStep(true)} style={{ ...BTN, borderColor: "#F09595", color: "#791F1F", background: "#FCEBEB" }}>Lost</button>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Add a note (optional)" aria-label="Note"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 8, fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
          <button onClick={() => setPanel(false)} style={{ fontSize: 11, marginTop: 6, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontFamily: "inherit", padding: 0 }}>Cancel</button>
        </div>
      )}

      {panel && lostStep && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "#FCEBEB", border: "0.5px solid #F09595" }}>
          <div style={{ fontSize: 12, color: "#791F1F", marginBottom: 8, fontWeight: 500 }}>Why was this deal lost?</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LOST_REASONS.map(r => <button key={r} disabled={busy} onClick={() => send({ lost: true, reason: r })} style={{ ...BTN, borderColor: "#F09595", color: "#791F1F", background: "white" }}>{r}</button>)}
          </div>
          <button onClick={() => setLostStep(false)} style={{ fontSize: 11, marginTop: 6, background: "none", border: "none", cursor: "pointer", color: "#791F1F", fontFamily: "inherit", padding: 0 }}>Back</button>
        </div>
      )}
    </div>
  );
}

// deals: open deals only, already filtered by the page's filters.
export default function TodayView({ deals, role, onOpen, onDealChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null); // { ok, text }
  const [showOlder, setShowOlder] = useState(false);
  const today = todayStr();

  const withState = deals.map(d => ({ d, s: followUpState(d, today) }));
  const byValueThenDue = (a, b) => (b.d.estimatedValue || 0) - (a.d.estimatedValue || 0) || b.s.overdueDays - a.s.overdueDays;
  const due = withState.filter(x => x.s.bucket === "today").sort(byValueThenDue);
  const older = withState.filter(x => x.s.bucket === "older").sort(byValueThenDue);
  const upcoming = withState.filter(x => x.s.bucket === "upcoming");
  const nextUp = upcoming.map(x => x.s.due).sort()[0];

  async function onCall(deal, payload) {
    if (busyId) return;
    setBusyId(deal._id); setNotice(null);
    try {
      const updated = await api.markDealCalled(deal._id, payload);
      onDealChanged(updated);
      setNotice({ ok: true, text: payload.lost
        ? `${deal.customerName} marked lost: ${payload.reason}.`
        : `${deal.customerName}: next follow-up ${friendlyDate(addDays(todayStr(), payload.days))}.` });
    } catch (e) {
      setNotice({ ok: false, text: `Couldn't save for ${deal.customerName}: ${(e && e.message) || "unknown error"}. Nothing was changed.` });
    } finally { setBusyId(null); }
  }

  const list = items => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map(({ d, s }) => <DealCard key={d._id} deal={d} state={s} role={role} busy={busyId === d._id} onOpen={onOpen} onCall={onCall} />)}
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      {notice && (
        <div role={notice.ok ? "status" : "alert"} style={{ fontSize: 13, padding: "9px 12px", borderRadius: 8, marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 10,
          background: notice.ok ? "#EAF3DE" : "#FCEBEB", border: `0.5px solid ${notice.ok ? "#97C459" : "#F09595"}`, color: notice.ok ? "#27500A" : "#791F1F" }}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Dismiss</button>
        </div>
      )}

      <div style={{ fontSize: 13, ...MUTED, marginBottom: 10 }}>
        {due.length === 0 ? "No follow-ups due today." : `${due.length} ${due.length === 1 ? "deal" : "deals"} to follow up, biggest first.`}
      </div>

      {due.length === 0 ? (
        <div style={{ padding: "28px 16px", textAlign: "center", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, fontSize: 13, ...MUTED }}>
          {upcoming.length > 0
            ? `You're clear. Next up: ${upcoming.length} ${upcoming.length === 1 ? "deal" : "deals"}, starting ${friendlyDate(nextUp)}.`
            : "You're clear. Add a deal or log a visit to fill this list."}
        </div>
      ) : list(due)}

      {older.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button onClick={() => setShowOlder(o => !o)} aria-expanded={showOlder}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, ...MUTED, fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <i className={`ti ti-chevron-${showOlder ? "down" : "right"}`} style={{ fontSize: 14 }} aria-hidden="true" />
            Older ({older.length}): not due for 2+ weeks
          </button>
          {showOlder && <div style={{ marginTop: 10 }}>{list(older)}</div>}
        </div>
      )}
    </div>
  );
}
