import { useState } from "react";
import * as api from "./api";

const USERS = [
  { username: "yash",     name: "Yash Jain",    role: "Admin" },
  { username: "mukesh",   name: "Mukesh Jain",  role: "Admin" },
  { username: "sarthak",  name: "Sarthak Jain", role: "Admin" },
  { username: "archana",  name: "Archana Jain", role: "Admin" },
  { username: "sanskar",  name: "Sanskar Jain", role: "Admin" },
  { username: "kishore",  name: "Kishore",      role: "Sales" },
  { username: "rajveer",  name: "Rajveer",      role: "Sales" },
  { username: "ramesh",   name: "Ramesh",       role: "Sales" },
  { username: "trina",    name: "Trina",        role: "Sales" },
  { username: "qcteam",   name: "QC Team",      role: "QC" },
  { username: "accounts", name: "Accounts",     role: "Accountant" },
];

const ROLE_COLOR = {
  Admin:      { bg: "#EEEDFE", fg: "#3C3489" },
  Sales:      { bg: "#E1F5EE", fg: "#085041" },
  QC:         { bg: "#FAEEDA", fg: "#633806" },
  Accountant: { bg: "#E6F1FB", fg: "#0C447C" },
};

function PasswordRow({ user }) {
  const [open, setOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(null); // null | "saving" | "success" | "error"
  const [errMsg, setErrMsg] = useState("");

  async function save() {
    if (!newPw.trim()) { setErrMsg("Enter a new password"); return; }
    if (newPw !== confirm) { setErrMsg("Passwords don't match"); return; }
    if (newPw.length < 6) { setErrMsg("Minimum 6 characters"); return; }
    setErrMsg("");
    setStatus("saving");
    try {
      await api.changePassword(user.username, newPw);
      setStatus("success");
      setNewPw("");
      setConfirm("");
      setTimeout(() => { setStatus(null); setOpen(false); }, 1500);
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message || "Failed to update password");
    }
  }

  const rc = ROLE_COLOR[user.role] || ROLE_COLOR.Admin;

  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "var(--color-background-primary)", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: rc.fg, flexShrink: 0 }}>
          {user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>@{user.username}</div>
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, background: rc.bg, color: rc.fg, fontWeight: 500 }}>{user.role}</span>
        <button onClick={() => { setOpen(o => !o); setStatus(null); setErrMsg(""); }}
          style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
          {open ? "Cancel" : "Change password"}
        </button>
      </div>

      {open && (
        <div style={{ padding: "12px 16px", background: "var(--color-background-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>New password</div>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters"
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 5 }}>Confirm password</div>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
              style={{ width: "100%", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "inherit" }}
              onKeyDown={e => e.key === "Enter" && save()} />
          </div>
          <button onClick={save} disabled={status === "saving"}
            style={{ fontSize: 13, padding: "8px 18px", borderRadius: 8, border: "none", background: status === "success" ? "#27500A" : "#C0392B", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, whiteSpace: "nowrap" }}>
            {status === "saving" ? "Saving..." : status === "success" ? "✓ Saved" : "Update"}
          </button>
          {errMsg && <div style={{ width: "100%", fontSize: 12, color: "#C0392B", marginTop: 4 }}>{errMsg}</div>}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 6 }}>Settings</div>
      <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>Admin only — manage user passwords</div>

      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
        User accounts
      </div>
      {USERS.map(u => <PasswordRow key={u.username} user={u} />)}

      <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: 10, fontSize: 12, color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <i className="ti ti-info-circle" style={{ marginRight: 6, fontSize: 13 }} />
        Password changes take effect immediately. Users will need to log in again after their password is changed.
      </div>
    </div>
  );
}