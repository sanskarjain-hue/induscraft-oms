import { useEffect, useRef, useState } from "react";

// The top-bar tabs, grouped. Each group is a button that slides open a small menu:
// it opens on hover with a mouse, and on tap or click everywhere else. Page ids are
// unchanged from the old flat tab list, so links between pages keep working.
// Reports and After-sales are left out on purpose: they aren't finished yet.
export const NAV_GROUPS = [
  {
    id: "ops", label: "Operations", short: "Ops", icon: "ti-building-warehouse",
    items: [
      { id: "dashboard", label: "Home", icon: "ti-home" },
      { id: "orders", label: "Orders", icon: "ti-file-text" },
      { id: "pastorders", label: "Archive", icon: "ti-archive" },
      { id: "vendors", label: "Vendors", icon: "ti-users" },
    ],
  },
  {
    id: "sales", label: "Sales", icon: "ti-briefcase",
    items: [
      { id: "pipeline", label: "Leads", icon: "ti-chart-dots" },
      { id: "visits", label: "Walk-ins", icon: "ti-walk" },
      { id: "sales", label: "Targets", icon: "ti-target-arrow" },
    ],
  },
  {
    id: "admin", label: "Admin", icon: "ti-shield-check",
    items: [
      { id: "overview", label: "Business", icon: "ti-chart-pie" },
      { id: "payouts", label: "Payouts", icon: "ti-cash" },
      { id: "settings", label: "Settings", icon: "ti-settings" },
    ],
  },
];

// Which pages each role can open. Admin sees everything in NAV_GROUPS.
const ROLE_PAGES = {
  sales: ["dashboard", "orders", "pastorders", "pipeline", "visits", "sales"],
  qc: ["dashboard", "orders"],
  accountant: ["dashboard", "orders", "pastorders"],
};

export function groupsFor(role) {
  const allowed = role === "admin" ? null : ROLE_PAGES[role] || ["dashboard", "orders"];
  return NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => !allowed || allowed.includes(i.id)) }))
    .filter(g => g.items.length > 0);
}

export function pageLabel(id) {
  for (const g of NAV_GROUPS) for (const i of g.items) if (i.id === id) return i.label;
  return null;
}

function Group({ group, page, open, onOpen, onClose, onNavigate, alignEnd }) {
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const via = useRef(null); // "hover" or "click": a hover-opened menu closes when the mouse leaves
  const leaveTimer = useRef(null);
  const active = group.items.find(i => i.id === page);
  const menuId = `nav-menu-${group.id}`;

  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  useEffect(() => { if (!open) via.current = null; }, [open]);

  const items = () => Array.from(listRef.current?.querySelectorAll("button") || []);
  const focusItem = idx => { const all = items(); if (all.length) all[(idx + all.length) % all.length].focus(); };

  function enter(e) {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer.current);
    if (!open) { via.current = "hover"; onOpen(); }
  }
  function leave(e) {
    if (e.pointerType !== "mouse" || via.current !== "hover") return;
    leaveTimer.current = setTimeout(onClose, 140);
  }
  function click() {
    if (!open) { via.current = "click"; onOpen(); return; }
    if (via.current === "hover") { via.current = "click"; return; } // pin a hover-opened menu instead of shutting it
    onClose();
  }
  function btnKey(e) {
    if (e.key === "ArrowDown" || ((e.key === "Enter" || e.key === " ") && !open)) {
      e.preventDefault(); via.current = "click"; onOpen();
      requestAnimationFrame(() => focusItem(Math.max(0, group.items.findIndex(i => i.id === page))));
    }
  }
  function listKey(e) {
    const all = items(); const idx = all.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focusItem(idx + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(idx - 1); }
    else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
    else if (e.key === "End") { e.preventDefault(); focusItem(all.length - 1); }
  }
  function blur(e) {
    // keyboard users tabbing out of the group close it
    if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) onClose();
  }

  return (
    <div className={`navg${open ? " is-open" : ""}${active ? " is-active" : ""}`} onPointerEnter={enter} onPointerLeave={leave} onBlur={blur}
      onKeyDown={e => { if (e.key === "Escape" && open) { e.stopPropagation(); onClose(); btnRef.current?.focus(); } }}>
      <button ref={btnRef} type="button" className="navg-btn" onClick={click} onKeyDown={btnKey}
        aria-expanded={open} aria-controls={menuId} aria-label={active ? `${group.label}: ${active.label}` : group.label}>
        <i className={`ti ${group.icon} nav-ico`} aria-hidden="true" />
        <span className={`navg-name${group.short ? " has-short" : ""}`}><span className="navg-long">{group.label}</span>{group.short && <span className="navg-short" aria-hidden="true">{group.short}</span>}</span>
        {active && <span className="navg-current"><span className="navg-sep" aria-hidden="true">·</span>{active.label}</span>}
        <i className="ti ti-chevron-down navg-chev" aria-hidden="true" />
      </button>
      <ul id={menuId} ref={listRef} className={`navg-menu${alignEnd ? " end" : ""}`} onKeyDown={listKey} aria-label={group.label}>
        {group.items.map((it, n) => (
          <li key={it.id} style={{ "--i": n }}>
            <button type="button" className={`navg-item${it.id === page ? " current" : ""}`} tabIndex={open ? 0 : -1}
              aria-current={it.id === page ? "page" : undefined}
              onClick={() => { onClose(); onNavigate(it.id); }}>
              <i className={`ti ${it.icon}`} aria-hidden="true" />
              <span>{it.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NavMenu({ role, page, onNavigate }) {
  const groups = groupsFor(role);
  const [openId, setOpenId] = useState(null);
  const wrap = useRef(null);

  // close on a click/tap anywhere outside, and when the page changes
  useEffect(() => {
    if (!openId) return;
    const off = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpenId(null); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [openId]);
  useEffect(() => { setOpenId(null); }, [page]);

  // A role with a single group (QC, accountant) gets plain tabs: a menu of one adds a click for nothing.
  if (groups.length === 1) {
    return (
      <div className="app-nav-links navflat" ref={wrap}>
        {groups[0].items.map(it => (
          <button key={it.id} type="button" className={`navflat-tab${it.id === page ? " current" : ""}`}
            aria-current={it.id === page ? "page" : undefined} onClick={() => onNavigate(it.id)}>
            <i className={`ti ${it.icon} nav-ico`} aria-hidden="true" /><span>{it.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="app-nav-links navgroups" ref={wrap}>
      {groups.map((g, i) => (
        <Group key={g.id} group={g} page={page} open={openId === g.id} alignEnd={i === groups.length - 1 && groups.length > 2}
          onOpen={() => setOpenId(g.id)} onClose={() => setOpenId(id => (id === g.id ? null : id))} onNavigate={onNavigate} />
      ))}
    </div>
  );
}
