import { useState, useEffect } from "react";
import { logFor } from "./updates";

const key = userId => `whatsnew:${userId || "user"}`;
function readSeen(userId) { try { return localStorage.getItem(key(userId)); } catch (e) { return null; } }
function writeSeen(userId, id) { try { localStorage.setItem(key(userId), id); } catch (e) { /* storage blocked: the dot just returns next visit */ } }

// A small "What's new" button for the top bar. Shows the log for the person's role, with a dot
// until they have opened the newest entry. Roles without a log get nothing.
export default function WhatsNew({ role, userId }) {
  const log = logFor(role);
  const latest = log && log[0] ? log[0].id : null;
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => (latest ? readSeen(userId) : null));

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!log || !latest) return null;
  const unseen = seen !== latest;

  function show() {
    setOpen(true);
    if (unseen) { writeSeen(userId, latest); setSeen(latest); }
  }

  return (
    <>
      <button onClick={show} title="What's new" aria-label={unseen ? "What's new (new updates)" : "What's new"}
        style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontFamily: "inherit" }}>
        <i className="ti ti-gift" aria-hidden="true" />
        {unseen && <span data-testid="whatsnew-dot" style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: "50%", background: "#C0392B", border: "1.5px solid var(--color-background-primary)" }} />}
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div role="dialog" aria-modal="true" aria-label="What's new" onClick={e => e.stopPropagation()}
            style={{ background: "var(--color-background-primary)", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "16px 22px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>What's new</div>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20 }}><i className="ti ti-x" /></button>
            </div>
            <div style={{ overflowY: "auto", padding: "8px 22px 22px" }}>
              {log.map(entry => (
                <section key={entry.id} style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{entry.date}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, margin: "2px 0 10px" }}>{entry.title}</div>
                  {entry.items.map(it => (
                    <div key={it.title} style={{ display: "flex", gap: 10, padding: "10px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      <i className={`ti ${it.icon}`} style={{ fontSize: 18, color: "var(--color-text-secondary)", marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{it.title}</div>
                        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2, lineHeight: 1.5 }}>{it.text}</div>
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
