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

function UserRow({ user, currentUserId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ name: user.name, username: user.username, role: user.role });
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
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "sales" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) { setErr("All fields required"); return; }
    setSaving(true); setErr("");
    try {
      const user = await api.createUser(form);
      onAdd(user);
      setForm({ name: "", username: "", password: "", role: "sales" });
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

      <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: 10, fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6, fontSize: 13 }} />
        Password changes take effect immediately. Users will need to log in again after their password is changed.
      </div>
    </div>
  );
}