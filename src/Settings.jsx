import { useState, useEffect } from "react";
import * as api from "./api";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "qc", label: "QC" },
  { value: "accountant", label: "Accountant" },
];

const ROLE_COLOR = {
  admin:      { bg: "#EEEDFE", fg: "#3C3489" },
  sales:      { bg: "#E1F5EE", fg: "#085041" },
  qc:         { bg: "#FAEEDA", fg: "#633806" },
  accountant: { bg: "#E6F1FB", fg: "#0C447C" },
};

// Which stores a sales user works in. They see, create and edit orders from these stores only.
const STORE_OPTIONS = ["Bangalore", "Pune", "Jodhpur"];
function StoresPicker({ value, onChange }) {
  const picked = value || [];
  const toggle = s => onChange(picked.includes(s) ? picked.filter(x => x !== s) : [...picked, s]);
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Stores (they only see these stores' orders)</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {STORE_OPTIONS.map(s => (
          <label key={s} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <input type="checkbox" checked={picked.includes(s)} onChange={() => toggle(s)} /> {s}
          </label>
        ))}
      </div>
      {picked.length === 0 && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 4 }}>No store picked — this person will see no orders.</div>}
    </div>
  );
}

function UserRow({ user, currentUserId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ name: user.name, username: user.username, role: user.role, stores: user.stores || [] });
  const [pw, setPw] = useState({ newPw: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const rc = ROLE_COLOR[user.role] || ROLE_COLOR.admin;
  const isSelf = user._id === currentUserId || user.id === currentUserId;

  async function saveEdit() {
    if (!form.name.trim() || !form.username.trim()) return;
    setSaving(true); setErr("");
    try {
      const updated = await api.updateUser(user._id || user.id, form);
      onUpdate(updated);
      setEditing(false);
      setOk("Saved");
      setTimeout(() => setOk(""), 2000);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function savePw() {
    if (pw.newPw.length < 6) { setErr("Minimum 6 characters"); return; }
    if (pw.newPw !== pw.confirm) { setErr("Passwords don't match"); return; }
    setSaving(true); setErr("");
    try {
      await api.updateUser(user._id || user.id, { password: pw.newPw });
      setChangingPw(false);
      setPw({ newPw: "", confirm: "" });
      setOk("Password changed");
      setTimeout(() => setOk(""), 2000);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function doDelete() {
    setSaving(true);
    try { await api.deleteUser(user._id || user.id); onDelete(user._id || user.id); }
    catch (e) { setErr(e.message); setSaving(false); }
  }

  const INPUT = { fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", width: "100%" };

  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "var(--color-background-primary)", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: rc.fg, flexShrink: 0 }}>
          {user.initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>@{user.username}</div>
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: rc.bg, color: rc.fg, fontWeight: 500 }}>
          {ROLES.find(r => r.value === user.role)?.label || user.role}
        </span>
        {ok && <span style={{ fontSize: 11, color: "#27500A", fontWeight: 500 }}>{ok}</span>}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { setEditing(e => !e); setChangingPw(false); setErr(""); }}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={() => { setChangingPw(e => !e); setEditing(false); setErr(""); }}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
            {changingPw ? "Cancel" : "Password"}
          </button>
          {!isSelf && (
            <button onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "0.5px solid #F09595", background: "transparent", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Full name</div>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Username</div>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={INPUT} />
          </div>
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Role</div>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={INPUT}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {form.role === "sales" && (
            <div style={{ width: "100%" }}>
              <StoresPicker value={form.stores} onChange={stores => setForm(f => ({ ...f, stores }))} />
            </div>
          )}
          <button onClick={saveEdit} disabled={saving} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            {saving ? "Saving..." : "Save"}
          </button>
          {err && <div style={{ width: "100%", fontSize: 12, color: "#C0392B" }}>{err}</div>}
        </div>
      )}

      {/* Password form */}
      {changingPw && (
        <div style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>New password</div>
            <input type="password" value={pw.newPw} onChange={e => setPw(p => ({ ...p, newPw: e.target.value }))} placeholder="Min 6 characters" style={INPUT} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Confirm</div>
            <input type="password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" style={INPUT} onKeyDown={e => e.key === "Enter" && savePw()} />
          </div>
          <button onClick={savePw} disabled={saving} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            {saving ? "Saving..." : "Update"}
          </button>
          {err && <div style={{ width: "100%", fontSize: 12, color: "#C0392B" }}>{err}</div>}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ padding: "12px 16px", background: "#FCEBEB", borderTop: "0.5px solid #F09595", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "#791F1F", flex: 1 }}>Remove {user.name}? This cannot be undone.</div>
          <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "0.5px solid #F09595", background: "transparent", color: "#791F1F", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={doDelete} disabled={saving} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Remove</button>
        </div>
      )}
    </div>
  );
}

function AddUserForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "sales", stores: [] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) { setErr("All fields required"); return; }
    setSaving(true); setErr("");
    try {
      const user = await api.createUser(form);
      onAdd(user);
      setForm({ name: "", username: "", password: "", role: "sales", stores: [] });
      setOpen(false);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const INPUT = { fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", width: "100%" };

  return (
    <div style={{ marginTop: 16 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} /> Add user
        </button>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px", background: "var(--color-background-primary)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>New user</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Full name *</div>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Trina Shah" style={INPUT} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Username *</div>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. trina" style={INPUT} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Password *</div>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" style={INPUT} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>Role</div>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={INPUT}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {form.role === "sales" && (
            <div style={{ marginBottom: 10 }}>
              <StoresPicker value={form.stores} onChange={stores => setForm(f => ({ ...f, stores }))} />
            </div>
          )}
          {err && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 8 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setOpen(false); setErr(""); }} style={{ fontSize: 12, padding: "7px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ fontSize: 12, padding: "7px 18px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
              {saving ? "Creating..." : "Create user"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PAY_CHANNELS = ["Bangalore", "Pune", "Jodhpur", "Website", "Wholesale"];
const PAY_FIELDS = [
  ["accountName", "Account name"],
  ["bankName", "Bank"],
  ["accountNumber", "Account number"],
  ["ifsc", "IFSC"],
  ["upi", "UPI ID"],
  ["notes", "Note (optional)"],
];

// Bank / UPI details printed on the Customer Copy, one set per sales channel.
// They are only defaults: the Customer Copy preview lets them be edited before printing.
function PaymentAccounts() {
  const [accounts, setAccounts] = useState(null);
  const [channel, setChannel] = useState(PAY_CHANNELS[0]);
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  useEffect(() => {
    api.fetchPaymentAccounts()
      .then(r => setAccounts(r.accounts || {}))
      .catch(e => { setLoadErr(e.message || "Could not load payment accounts"); setAccounts({}); });
  }, []);

  function setField(key, value) {
    setAccounts(prev => ({ ...prev, [channel]: { ...((prev || {})[channel] || {}), [key]: value } }));
    setMsg({ ok: "", err: "" });
  }

  async function save() {
    setSaving(true); setMsg({ ok: "", err: "" });
    try {
      const r = await api.savePaymentAccounts(accounts);
      setAccounts(r.accounts || accounts);
      setMsg({ ok: "Saved", err: "" });
      setTimeout(() => setMsg(m => ({ ...m, ok: "" })), 2000);
    } catch (e) { setMsg({ ok: "", err: e.message || "Could not save" }); }
    finally { setSaving(false); }
  }

  const current = (accounts && accounts[channel]) || {};
  const INPUT = { width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Payment accounts</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
        Account details printed on the Customer Copy, set per channel. They can still be edited on the print preview.
      </div>
      {loadErr && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 8 }}>{loadErr}</div>}
      {!accounts ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Loading...</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-primary)" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {PAY_CHANNELS.map(c => (
              <button key={c} onClick={() => setChannel(c)} style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                border: "0.5px solid var(--color-border-secondary)",
                background: channel === c ? "var(--color-background-secondary)" : "transparent",
                color: channel === c ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontWeight: channel === c ? 500 : 400,
              }}>{c === "Wholesale" ? "B2B" : c}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {PAY_FIELDS.map(([key, label]) => (
              <div key={key} style={key === "notes" ? { gridColumn: "1 / -1" } : undefined}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
                <input value={current[key] || ""} onChange={e => setField(key, e.target.value)} style={INPUT} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {msg.err && <span style={{ fontSize: 12, color: "#C0392B" }}>{msg.err}</span>}
            {msg.ok && <span style={{ fontSize: 12, color: "#27500A" }}>{msg.ok}</span>}
            <button onClick={save} disabled={saving} style={{ fontSize: 12, padding: "7px 18px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "Save all channels"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Commission slabs, GST factor and the channels that count. Admin only.
// Slabs are entered in rupees of monthly sales (GST-inclusive) and a rate in percent.
function CommissionRules() {
  const [cfg, setCfg] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  useEffect(() => {
    api.fetchCommissionConfig()
      .then(r => { setCfg(toForm(r.config)); setDefaults(r.defaults); })
      .catch(e => { setLoadErr(e.message || "Could not load commission rules"); });
  }, []);

  function toForm(c) {
    return {
      gstFactor: String(c.gstFactor),
      slabs: c.slabs.map(s => ({ from: String(s.from), rate: String(s.rate) })),
      channels: c.channels.join(", "),
    };
  }
  function touch(next) { setCfg(next); setMsg({ ok: "", err: "" }); }
  function setSlab(i, key, value) {
    touch({ ...cfg, slabs: cfg.slabs.map((s, j) => (j === i ? { ...s, [key]: value } : s)) });
  }

  async function save() {
    setSaving(true); setMsg({ ok: "", err: "" });
    try {
      const payload = {
        gstFactor: Number(cfg.gstFactor),
        slabs: cfg.slabs.map(s => ({ from: Number(s.from), rate: Number(s.rate) })),
        channels: cfg.channels.split(",").map(c => c.trim()).filter(Boolean),
      };
      const r = await api.saveCommissionConfig(payload);
      setCfg(toForm(r.config));
      setMsg({ ok: "Saved. It applies to every month, including past ones.", err: "" });
      setTimeout(() => setMsg(m => ({ ...m, ok: "" })), 4000);
    } catch (e) { setMsg({ ok: "", err: e.message || "Could not save" }); }
    finally { setSaving(false); }
  }

  const INPUT = { width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: "inherit", boxSizing: "border-box" };
  const LABEL = { fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 };

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Commission rules</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 14 }}>
        Each salesperson's slab is set by their own monthly sales, and its rate applies to everything they sold that month.
      </div>
      {loadErr && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 8 }}>{loadErr}</div>}
      {!cfg ? (
        !loadErr && <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Loading...</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-primary)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
            <div style={LABEL}>Monthly sales from (₹, incl. GST)</div>
            <div style={LABEL}>Commission rate (%)</div>
          </div>
          {cfg.slabs.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 10, marginBottom: 8, alignItems: "center" }}>
              <input aria-label={`Slab ${i + 1} sales from`} inputMode="numeric" value={s.from} onChange={e => setSlab(i, "from", e.target.value)} style={INPUT} />
              <input aria-label={`Slab ${i + 1} rate`} inputMode="decimal" value={s.rate} onChange={e => setSlab(i, "rate", e.target.value)} style={INPUT} />
              <button aria-label={`Remove slab ${i + 1}`} disabled={cfg.slabs.length <= 1} onClick={() => touch({ ...cfg, slabs: cfg.slabs.filter((_, j) => j !== i) })}
                style={{ background: "none", border: "none", cursor: cfg.slabs.length <= 1 ? "default" : "pointer", color: "var(--color-text-secondary)", fontSize: 16, opacity: cfg.slabs.length <= 1 ? 0.3 : 1 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
          <button onClick={() => touch({ ...cfg, slabs: [...cfg.slabs, { from: "", rate: "" }] })}
            style={{ fontSize: 12, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-info)", fontFamily: "inherit", padding: 0, marginBottom: 14 }}>
            + Add slab
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
            <div>
              <div style={LABEL}>GST factor</div>
              <input aria-label="GST factor" inputMode="decimal" value={cfg.gstFactor} onChange={e => touch({ ...cfg, gstFactor: e.target.value })} style={INPUT} />
            </div>
            <div>
              <div style={LABEL}>Channels that count (comma separated)</div>
              <input aria-label="Channels that count" value={cfg.channels} onChange={e => touch({ ...cfg, channels: e.target.value })} style={INPUT} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>
            Commission is worked out on order value × the GST factor. Below the first slab, commission is 0.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            {msg.err && <span role="alert" style={{ fontSize: 12, color: "#C0392B" }}>{msg.err}</span>}
            {msg.ok && <span style={{ fontSize: 12, color: "#27500A" }}>{msg.ok}</span>}
            {defaults && (
              <button onClick={() => touch(toForm(defaults))} style={{ fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                Reset to defaults
              </button>
            )}
            <button onClick={save} disabled={saving} style={{ fontSize: 12, padding: "7px 18px", borderRadius: 8, border: "none", background: "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : "Save rules"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  function handleUpdate(updated) {
    setUsers(prev => prev.map(u => (u._id === updated._id || u.id === updated._id) ? { ...u, ...updated } : u));
  }

  function handleDelete(id) {
    setUsers(prev => prev.filter(u => u._id !== id && u.id !== id));
  }

  function handleAdd(user) {
    setUsers(prev => [...prev, user]);
  }

  const grouped = {
    admin: users.filter(u => u.role === "admin"),
    sales: users.filter(u => u.role === "sales"),
    qc: users.filter(u => u.role === "qc"),
    accountant: users.filter(u => u.role === "accountant"),
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Settings</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>Manage users — add, edit, change passwords, remove</div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Loading users...</div>
      ) : (
        <>
          {Object.entries(grouped).filter(([, list]) => list.length > 0).map(([role, list]) => (
            <div key={role} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                {ROLES.find(r => r.value === role)?.label} ({list.length})
              </div>
              {list.map(user => (
                <UserRow key={user._id || user.id} user={user} currentUserId={currentUser?.id} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </div>
          ))}
          <AddUserForm onAdd={handleAdd} />
        </>
      )}

      {currentUser?.role === "admin" && <PaymentAccounts />}
      {currentUser?.role === "admin" && <CommissionRules />}

      <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: 10, fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6, fontSize: 13 }} />
        Password changes take effect immediately. Users will need to log in again after their password is changed.
      </div>
    </div>
  );
}