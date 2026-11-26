import { useState, useEffect, useMemo, useRef } from "react";
import * as api from "./api";
import { formatCurrency } from "./ui";

// ── Easy-to-edit lists ────────────────────────────────────
const STORES = ["Bangalore", "Pune", "Jodhpur"];
const PRODUCTS = ["Sofa", "Bed", "Dining table", "Wardrobe", "Coffee table", "TV unit", "Chairs", "Study / Office", "Storage", "Decor", "Other"];
const WEB_SOURCES = ["Shopify", "WhatsApp", "Instagram", "Call", "Email", "Other"];
const LEVELS = [
  { id: "Browsing", hint: "Just looking", bg: "#F1EFE8", fg: "#444441", border: "#D8D5CB" },
  { id: "Interested", hint: "Asked questions", bg: "#FAEEDA", fg: "#633806", border: "#EF9F27" },
  { id: "Hot", hint: "Ready / asked price", bg: "#FCEBEB", fg: "#791F1F", border: "#F09595" },
];
const STAGE_COLORS = {
  "New Inquiry": { bg: "#F1EFE8", fg: "#444441", border: "#D8D5CB" },
  "Warm": { bg: "#FAEEDA", fg: "#633806", border: "#EF9F27" },
  "Cold": { bg: "#E6F1FB", fg: "#0C447C", border: "#A8CBE8" },
  "Negotiation": { bg: "#EEEDFE", fg: "#3C3489", border: "#B5B2F0" },
  "Won": { bg: "#EAF3DE", fg: "#27500A", border: "#97C459" },
  "Lost": { bg: "#FCEBEB", fg: "#791F1F", border: "#F09595" },
};
const RANGES = [{ id: "today", label: "Today" }, { id: "7", label: "7 days" }, { id: "30", label: "30 days" }];

const INPUT = { width: "100%", fontSize: 14, padding: "9px 11px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit" };
const LABEL = { fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 6, fontWeight: 500 };
const CARD = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16 };

// ── small helpers ─────────────────────────────────────────
const digitsOnly = s => String(s || "").replace(/\D/g, "");
const phoneOk = s => { const d = digitsOnly(s); return d.length === 0 || (d.length >= 10 && d.length <= 15); };
const fmtPhone = p => (p && p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p || "");
const fmtTime = d => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const dayKey = d => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
function dayLabel(d) {
  const x = new Date(d), t = new Date();
  if (dayKey(x) === dayKey(t)) return "Today";
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (dayKey(x) === dayKey(y)) return "Yesterday";
  return x.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
const errText = e => (e && e.message) || "Something went wrong. Please try again.";

function Chip({ active, onClick, children, tone }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!active}
      style={{ fontSize: 13, padding: "8px 14px", minHeight: 38, borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 600 : 400,
        border: `0.5px solid ${active ? (tone ? tone.border : "#C0392B") : "var(--color-border-secondary)"}`,
        background: active ? (tone ? tone.bg : "#FCEBEB") : "var(--color-background-secondary)",
        color: active ? (tone ? tone.fg : "#791F1F") : "var(--color-text-primary)" }}>
      {children}
    </button>
  );
}

function LevelPill({ level }) {
  const c = LEVELS.find(l => l.id === level) || LEVELS[0];
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.fg, border: `0.5px solid ${c.border}`, fontWeight: 600, whiteSpace: "nowrap" }}>{level}</span>;
}

function StagePill({ stage }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS["New Inquiry"];
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.fg, border: `0.5px solid ${c.border}`, fontWeight: 500, whiteSpace: "nowrap" }}>{stage}</span>;
}

function Banner({ tone, children }) {
  const t = tone === "error" ? { bg: "#FCEBEB", fg: "#C0392B", bd: "#f09595", icon: "ti-alert-circle" } : { bg: "#EAF3DE", fg: "#27500A", bd: "#97C459", icon: "ti-circle-check" };
  return (
    <div role={tone === "error" ? "alert" : "status"} style={{ fontSize: 13, color: t.fg, background: t.bg, padding: "9px 12px", borderRadius: 8, border: `0.5px solid ${t.bd}`, display: "flex", gap: 6, alignItems: "center" }}>
      <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />{children}
    </div>
  );
}

// ── the one-and-only walk-in form (used for new visits and for editing) ──
function VisitFields({ v, set, showStore }) {
  const toggle = p => set({ interests: v.interests.includes(p) ? v.interests.filter(x => x !== p) : [...v.interests, p] });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showStore && (
        <div>
          <label style={LABEL}>Showroom</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STORES.map(s => <Chip key={s} active={v.channel === s} onClick={() => set({ channel: s })}>{s}</Chip>)}
          </div>
        </div>
      )}
      <div>
        <label style={LABEL}>What were they looking at?</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRODUCTS.map(p => <Chip key={p} active={v.interests.includes(p)} onClick={() => toggle(p)}>{p}</Chip>)}
        </div>
      </div>
      <div>
        <label style={LABEL}>How interested?</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {LEVELS.map(l => {
            const on = v.level === l.id;
            return (
              <button key={l.id} type="button" onClick={() => set({ level: l.id })} aria-pressed={on}
                style={{ padding: "9px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textAlign: "center",
                  border: `${on ? 1.5 : 0.5}px solid ${on ? l.border : "var(--color-border-secondary)"}`, background: on ? l.bg : "var(--color-background-secondary)", color: on ? l.fg : "var(--color-text-primary)" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{l.id}</div>
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{l.hint}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div><label style={LABEL}>Name (optional)</label><input value={v.customerName} onChange={e => set({ customerName: e.target.value })} style={INPUT} placeholder="If they shared it" autoComplete="off" /></div>
        <div><label style={LABEL}>Phone (optional)</label><input value={v.customerPhone} onChange={e => set({ customerPhone: e.target.value })} style={INPUT} placeholder="10-digit mobile" inputMode="tel" autoComplete="off" /></div>
      </div>
      <div><label style={LABEL}>Note (optional)</label><input value={v.note} onChange={e => set({ note: e.target.value })} style={INPUT} placeholder="e.g. wants 6-seater, moving in March" autoComplete="off" /></div>
    </div>
  );
}

function checkVisit(v) {
  if (!v.channel) return "Choose which showroom.";
  if (v.interests.length === 0 && !v.note.trim()) return "Pick what they looked at, or add a note.";
  if (!phoneOk(v.customerPhone)) return "Phone number should be 10 digits.";
  return "";
}

function readStore() { try { return localStorage.getItem("visits_store") || ""; } catch { return ""; } }
function rememberStore(s) { try { localStorage.setItem("visits_store", s); } catch { /* storage unavailable: fine */ } }

const blankVisit = channel => ({ channel, interests: [], level: "Browsing", customerName: "", customerPhone: "", note: "" });

// ── one row in the visit list ──
function VisitRow({ v, role, visitNo, onSaved, onOpenPipeline, setNotice }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [converting, setConverting] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const hasContact = !!(v.customerName || v.customerPhone);

  function startEdit() {
    setDraft({ channel: v.channel, interests: v.interests || [], level: v.level, customerName: v.customerName || "", customerPhone: v.customerPhone || "", note: v.note || "" });
    setErr(""); setEditing(true);
  }
  async function saveEdit() {
    const problem = checkVisit(draft);
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr("");
    try { onSaved(await api.updateVisit(v._id, draft)); setEditing(false); }
    catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  }
  async function convert() {
    setBusy(true); setErr("");
    try {
      const res = await api.convertVisit(v._id, { estimatedValue: value ? Number(value) : 0 });
      onSaved(res.visit); setConverting(false);
      setNotice({ tone: "ok", text: `${res.deal.customerName} added to your pipeline.` });
    } catch (e) {
      if (e && e.status === 409) { setConverting(false); }
      setErr(errText(e));
    } finally { setBusy(false); }
  }

  return (
    <div style={{ padding: "12px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
      {!editing ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{v.customerName || "Unnamed visitor"}</span>
                <LevelPill level={v.level} />
                {visitNo > 1 && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#EEEDFE", color: "#3C3489", border: "0.5px solid #B5B2F0", fontWeight: 600 }}>Visit #{visitNo}</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
                {fmtTime(v.visitedAt)} · {v.channel}{role === "admin" ? ` · ${v.salesperson}` : ""}
                {v.customerPhone && <> · <a href={`tel:${v.customerPhone}`} style={{ color: "var(--color-text-info)", textDecoration: "none" }}>{fmtPhone(v.customerPhone)}</a></>}
              </div>
              {(v.interests && v.interests.length > 0) && <div style={{ fontSize: 13, marginTop: 6 }}>{v.interests.join(" · ")}</div>}
              {v.note && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>{v.note}</div>}
            </div>
            <button onClick={startEdit} aria-label="Edit visit" title="Edit"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 17, padding: 6, flexShrink: 0 }}><i className="ti ti-pencil" /></button>
          </div>

          <div style={{ marginTop: 8 }}>
            {v.dealId ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#27500A" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}><i className="ti ti-circle-check" />In pipeline</span>
                <button onClick={onOpenPipeline} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-info)", fontSize: 12, fontFamily: "inherit", padding: 0 }}>Open pipeline</button>
              </div>
            ) : !hasContact ? (
              <button onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12, fontFamily: "inherit", padding: 0 }}>
                <i className="ti ti-plus" /> Add a name or phone to put them in the pipeline
              </button>
            ) : !converting ? (
              <button onClick={() => { setConverting(true); setErr(""); }}
                style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "0.5px solid #C0392B", background: "#FCEBEB", color: "#C0392B", cursor: "pointer", fontFamily: "inherit" }}>
                Add to pipeline
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input value={value} onChange={e => setValue(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Est. value ₹ (optional)" style={{ ...INPUT, width: 190, fontSize: 13 }} />
                <button onClick={convert} disabled={busy}
                  style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: busy ? "wait" : "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}>
                  {busy ? "Adding…" : "Add"}
                </button>
                <button onClick={() => setConverting(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <VisitFields v={draft} set={p => setDraft(d => ({ ...d, ...p }))} showStore />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setEditing(false)} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveEdit} disabled={busy} style={{ fontSize: 13, fontWeight: 600, padding: "8px 20px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: busy ? "wait" : "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
      {err && <div style={{ marginTop: 8 }}><Banner tone="error">{err}</Banner></div>}
    </div>
  );
}

// ── WALK-IN TAB ───────────────────────────────────────────
function WalkIns({ role, onOpenPipeline, setNotice }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [form, setForm] = useState(() => blankVisit(readStore()));
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [range, setRange] = useState("today");

  useEffect(() => {
    let live = true;
    api.fetchVisits(30)
      .then(d => { if (live) setVisits(d); })
      .catch(e => { if (live) setLoadErr(errText(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function save() {
    const problem = checkVisit(form);
    if (problem) { setFormErr(problem); return; }
    setSaving(true); setFormErr("");
    try {
      const created = await api.createVisit(form);
      rememberStore(form.channel);
      setVisits(list => [created, ...list]);
      setForm(blankVisit(form.channel));
      setRange("today");
      const repeat = created.previousVisits > 0 ? ` Repeat visitor — seen ${created.previousVisits} time${created.previousVisits > 1 ? "s" : ""} before.` : "";
      setNotice({ tone: "ok", text: `Visit logged.${repeat}` });
    } catch (e) { setFormErr(errText(e)); }
    finally { setSaving(false); }
  }

  const replace = updated => setVisits(list => list.map(x => (x._id === updated._id ? { ...x, ...updated } : x)));

  // "Visit #n" for people seen more than once (matched by phone within the loaded 30 days)
  const visitNo = useMemo(() => {
    const seen = {}, out = {};
    [...visits].sort((a, b) => new Date(a.visitedAt) - new Date(b.visitedAt)).forEach(v => {
      if (!v.customerPhone) return;
      seen[v.customerPhone] = (seen[v.customerPhone] || 0) + 1;
      out[v._id] = seen[v.customerPhone];
    });
    return out;
  }, [visits]);

  const shown = useMemo(() => {
    let cutoff;
    if (range === "today") { const t = new Date(); t.setHours(0, 0, 0, 0); cutoff = t.getTime(); }
    else cutoff = Date.now() - Number(range) * 86400000;
    return visits.filter(v => new Date(v.visitedAt).getTime() >= cutoff);
  }, [visits, range]);

  const groups = useMemo(() => {
    const m = new Map();
    shown.forEach(v => { const k = dayKey(v.visitedAt); if (!m.has(k)) m.set(k, { label: dayLabel(v.visitedAt), items: [] }); m.get(k).items.push(v); });
    return [...m.values()];
  }, [shown]);

  const stats = [
    { label: "Visitors", value: shown.length },
    { label: "Hot", value: shown.filter(v => v.level === "Hot").length, color: "#791F1F" },
    { label: "Left contact", value: shown.filter(v => v.customerName || v.customerPhone).length },
    { label: "In pipeline", value: shown.filter(v => v.dealId).length, color: "#27500A" },
  ];

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Log a visitor</div>
        <VisitFields v={form} set={p => setForm(f => ({ ...f, ...p }))} showStore />
        {formErr && <div style={{ marginTop: 12 }}><Banner tone="error">{formErr}</Banner></div>}
        <button onClick={save} disabled={saving}
          style={{ marginTop: 14, width: "100%", fontSize: 14, fontWeight: 600, padding: "12px 0", borderRadius: 10, border: "none", background: "#C0392B", color: "white", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Log visit"}
        </button>
      </div>

      <div style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{role === "admin" ? "All visits" : "Your visits"}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {RANGES.map(r => <Chip key={r.id} active={range === r.id} onClick={() => setRange(r.id)} tone={{ bg: "var(--color-background-info)", fg: "var(--color-text-info)", border: "#A8CBE8" }}>{r.label}</Chip>)}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 6 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color || "var(--color-text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "16px 0" }}>Loading visits…</div>}
        {loadErr && <div style={{ marginTop: 10 }}><Banner tone="error">{loadErr}</Banner></div>}
        {!loading && !loadErr && shown.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "18px 0", textAlign: "center" }}>
            {range === "today" ? "No visitors logged today yet." : "No visitors in this period."}
          </div>
        )}
        {groups.map(g => (
          <div key={g.label} style={{ marginTop: 12 }}>
            {range !== "today" && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>{g.label}</div>}
            {g.items.map(v => <VisitRow key={v._id} v={v} role={role} visitNo={visitNo[v._id] || 1} onSaved={replace} onOpenPipeline={onOpenPipeline} setNotice={setNotice} />)}
          </div>
        ))}
      </div>
    </>
  );
}

// ── WEBSITE ENQUIRY TAB ───────────────────────────────────
const blankWeb = { customerName: "", customerPhone: "", customerEmail: "", enquiry: "", source: "Shopify", estimatedValue: "" };

function WebsiteEnquiries({ onOpenPipeline, setNotice }) {
  const [form, setForm] = useState(blankWeb);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const set = p => setForm(f => ({ ...f, ...p }));

  useEffect(() => {
    let live = true;
    api.fetchDeals()
      .then(d => { if (live) setRecent(d.filter(x => x.channel === "Website").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15)); })
      .catch(() => { /* the list is a convenience; the form still works */ })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function save() {
    if (!form.customerName.trim()) return setErr("Customer name is required.");
    if (!form.customerPhone.trim() && !form.customerEmail.trim()) return setErr("Add a phone number or an email so we can follow up.");
    if (!phoneOk(form.customerPhone)) return setErr("Phone number should be 10 digits.");
    if (!form.enquiry.trim()) return setErr("What are they asking about?");
    setSaving(true); setErr("");
    try {
      const deal = await api.createWebsiteEnquiry({ ...form, estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0 });
      setRecent(r => [deal, ...r].slice(0, 15));
      setForm(f => ({ ...blankWeb, source: f.source }));
      setNotice({ tone: "ok", text: `${deal.customerName} added to your pipeline.` });
    } catch (e) { setErr(errText(e)); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div style={CARD}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Add a website enquiry</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={LABEL}>Where did it come from?</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {WEB_SOURCES.map(s => <Chip key={s} active={form.source === s} onClick={() => set({ source: s })}>{s}</Chip>)}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div><label style={LABEL}>Name *</label><input value={form.customerName} onChange={e => set({ customerName: e.target.value })} style={INPUT} autoComplete="off" /></div>
            <div><label style={LABEL}>Phone</label><input value={form.customerPhone} onChange={e => set({ customerPhone: e.target.value })} style={INPUT} inputMode="tel" placeholder="10-digit mobile" autoComplete="off" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div><label style={LABEL}>Email</label><input value={form.customerEmail} onChange={e => set({ customerEmail: e.target.value })} style={INPUT} inputMode="email" autoComplete="off" /></div>
            <div><label style={LABEL}>Est. value ₹ (optional)</label><input value={form.estimatedValue} onChange={e => set({ estimatedValue: e.target.value.replace(/[^\d]/g, "") })} style={INPUT} inputMode="numeric" autoComplete="off" /></div>
          </div>
          <div><label style={LABEL}>What are they asking about? *</label><textarea value={form.enquiry} onChange={e => set({ enquiry: e.target.value })} style={{ ...INPUT, minHeight: 70, resize: "vertical" }} placeholder="e.g. Jaipur sofa 3-seater in teak finish, delivery to Pune" /></div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Phone or email is needed. This goes straight into your pipeline as a Website lead.</div>
        </div>
        {err && <div style={{ marginTop: 12 }}><Banner tone="error">{err}</Banner></div>}
        <button onClick={save} disabled={saving}
          style={{ marginTop: 14, width: "100%", fontSize: 14, fontWeight: 600, padding: "12px 0", borderRadius: 10, border: "none", background: "#C0392B", color: "white", cursor: saving ? "wait" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : "Add enquiry"}
        </button>
      </div>

      <div style={CARD}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Recent website enquiries</div>
        {loading && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "12px 0" }}>Loading…</div>}
        {!loading && recent.length === 0 && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "14px 0", textAlign: "center" }}>No website enquiries yet.</div>}
        {recent.map(d => (
          <div key={d._id} style={{ padding: "10px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{d.customerName}</span>
              <StagePill stage={d.stage} />
              {d.source && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>via {d.source}</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
              {dayLabel(d.createdAt)}, {fmtTime(d.createdAt)}{d.estimatedValue > 0 ? ` · ${formatCurrency(d.estimatedValue)}` : ""}
            </div>
            {d.enquiry && <div style={{ fontSize: 13, marginTop: 4 }}>{d.enquiry}</div>}
          </div>
        ))}
        {recent.length > 0 && (
          <button onClick={onOpenPipeline} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-info)", fontSize: 12, fontFamily: "inherit", padding: 0 }}>Open pipeline</button>
        )}
      </div>
    </>
  );
}

// ── PAGE ──────────────────────────────────────────────────
export default function Visits({ role, onOpenPipeline }) {
  const [mode, setMode] = useState("walkin");
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!notice) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer.current);
  }, [notice]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 6, background: "var(--color-background-secondary)", padding: 4, borderRadius: 12 }}>
        {[{ id: "walkin", label: "Showroom walk-in", icon: "ti-walk" }, { id: "website", label: "Website enquiry", icon: "ti-world" }].map(t => (
          <button key={t.id} onClick={() => { setMode(t.id); setNotice(null); }} aria-pressed={mode === t.id}
            style={{ flex: 1, fontSize: 13, padding: "9px 8px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: mode === t.id ? 600 : 400,
              background: mode === t.id ? "var(--color-background-primary)" : "transparent", color: mode === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              boxShadow: mode === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 15 }} />{t.label}
          </button>
        ))}
      </div>
      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}
      {mode === "walkin"
        ? <WalkIns role={role} onOpenPipeline={onOpenPipeline} setNotice={setNotice} />
        : <WebsiteEnquiries onOpenPipeline={onOpenPipeline} setNotice={setNotice} />}
    </div>
  );
}
