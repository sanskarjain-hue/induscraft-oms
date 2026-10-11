export function Badge({ children, variant = "gray" }) {
  const styles = {
    blue: { background: "#E6F1FB", color: "#0C447C" },
    amber: { background: "#FAEEDA", color: "#633806" },
    green: { background: "#EAF3DE", color: "#27500A" },
    red: { background: "#FCEBEB", color: "#791F1F" },
    gray: { background: "#F1EFE8", color: "#444441" },
    teal: { background: "#E1F5EE", color: "#085041" },
    purple: { background: "#EEEDFE", color: "#3C3489" },
    coral: { background: "#FAECE7", color: "#712B13" },
  };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, padding: "2px 8px",
      borderRadius: 7, fontWeight: 500, ...styles[variant]
    }}>{children}</span>
  );
}

export function channelVariant(channel) {
  return { Bangalore: "blue", Pune: "gray", Jodhpur: "teal", Website: "blue", Wholesale: "purple" }[channel] || "gray";
}

export function stageVariant(stageIndex) {
  if (stageIndex >= 8) return "green";
  if (stageIndex >= 5) return "teal";
  if (stageIndex >= 3) return "amber";
  return "gray";
}

export function delayStatus(order) {
  const item = order.items.find(i => i.originalDelivery !== i.currentDelivery);
  if (!item) {
    const overdue = order.items.some(i => {
      const exp = new Date(i.currentDelivery);
      return exp < new Date() && i.stageIndex < 8;
    });
    return overdue ? "overdue" : "on-track";
  }
  return "delayed";
}

export function Btn({ children, onClick, variant = "default", style = {} }) {
  const base = {
    fontSize: 12, padding: "7px 14px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 5,
    fontFamily: "inherit"
  };
  const variants = {
    danger: { borderColor: "#F09595", color: "#791F1F", background: "#FCEBEB" },
    primary: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none" },
    green: { background: "#EAF3DE", borderColor: "#97C459", color: "#27500A" },
  };
  return (
    <button onClick={onClick} style={{ ...base, ...(variants[variant] || {}), ...style }}>
      {children}
    </button>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "14px 16px", ...style
    }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)",
      textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, ...style
    }}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, valueColor, sub }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: valueColor || "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function Avatar({ initials, color = "blue", size = 36 }) {
  const colors = {
    blue: { bg: "#E6F1FB", fg: "#0C447C" },
    purple: { bg: "#EEEDFE", fg: "#3C3489" },
    teal: { bg: "#E1F5EE", fg: "#085041" },
    coral: { bg: "#FAECE7", fg: "#712B13" },
    green: { bg: "#EAF3DE", fg: "#27500A" },
    info: { bg: "var(--color-background-info)", fg: "var(--color-text-info)" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.33,
      fontWeight: 500, color: c.fg, flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

export function DelayDot({ status }) {
  const colors = { "on-track": "#639922", "delayed": "#BA7517", "overdue": "#E24B4A" };
  return (
    <span style={{
      width: 8, height: 8, borderRadius: "50%",
      background: colors[status] || "#888", display: "inline-block", marginRight: 5
    }} />
  );
}

export function formatCurrency(n) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function MiniPipeline({ stageIndex, total = 9 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
            background: i < stageIndex ? "#639922" : i === stageIndex ? "#BA7517" : "var(--color-background-secondary)",
            border: `1.5px solid ${i < stageIndex ? "#639922" : i === stageIndex ? "#BA7517" : "var(--color-border-secondary)"}`,
          }} />
          {i < total - 1 && (
            <div style={{ flex: 1, height: 2, background: i < stageIndex ? "#639922" : "var(--color-border-tertiary)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── STAGE TIMERS ──────────────────────────────────────────
// Consolidated from Dashboard.jsx + OrderDetail.jsx (previously duplicated verbatim in both).
// Stage durations are business-rule SLAs per production stage (see Order tracker spec).
export const STAGE_DURATIONS = {
  0: 3,    // Looking for vendor — 3 days
  1: 14,   // Processing started — 14 days
  2: null, // Raw ready — gate, no timer
  3: 7,    // Finishing — 7 days
  4: 7,    // QC — 7 days
  5: 7,    // Packed — 7 days
  6: 7,    // Dispatched — 7 days
  7: null, // Delivered to warehouse — paused (awaiting customer)
  8: null, // Delivered to customer — done
};

export function getStageTimer(item, orderDate) {
  const stage = item.stageIndex;
  const duration = STAGE_DURATIONS[stage];
  if (duration === null || duration === undefined) return null;

  let enteredAt = null;
  if (item.stageHistory && item.stageHistory.length > 0) {
    const entry = [...item.stageHistory].reverse().find(h => h.stageIndex === stage);
    if (entry) enteredAt = new Date(entry.enteredAt);
  }
  if (!enteredAt && stage === 0 && orderDate) {
    enteredAt = new Date(orderDate);
  }
  if (!enteredAt) return null;

  const deadline = new Date(enteredAt);
  deadline.setDate(deadline.getDate() + duration);
  const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
  return { daysLeft, deadline };
}

export function getOrderTimerStatus(order) {
  let worst = null;
  for (const item of order.items) {
    const t = getStageTimer(item, order.date);
    if (!t) continue;
    if (!worst || t.daysLeft < worst.daysLeft) worst = t;
  }
  return worst;
}

function timerColor(daysLeft) {
  return daysLeft > 2 ? { bg: "#EAF3DE", fg: "#27500A" }
       : daysLeft > 0 ? { bg: "#FAEEDA", fg: "#633806" }
       : { bg: "#FCEBEB", fg: "#791F1F" };
}

export function TimerPill({ item, orderDate, compact = false }) {
  const timer = getStageTimer(item, orderDate);
  if (!timer) return null;
  const { daysLeft } = timer;
  const color = timerColor(daysLeft);
  const label = daysLeft > 0
    ? compact ? `${daysLeft}d` : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`
    : compact ? `${Math.abs(daysLeft)}d late` : `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""}`;
  return (
    <span style={{ fontSize: compact ? 10 : 11, padding: compact ? "1px 6px" : "2px 8px", borderRadius: 6, background: color.bg, color: color.fg, fontWeight: 500, whiteSpace: "nowrap" }}>
      {!compact && <i className="ti ti-clock" style={{ fontSize: 10, marginRight: 3 }} />}
      {label}
    </span>
  );
}

// Compact pill used in dashboard/list table cells — takes a pre-computed timer object directly
export function OrderTimerCell({ order }) {
  const t = getOrderTimerStatus(order);
  if (!t) return <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>—</span>;
  const { daysLeft } = t;
  const color = timerColor(daysLeft);
  const label = daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d late`;
  return <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 6, background: color.bg, color: color.fg, fontWeight: 500 }}>{label}</span>;
}

// ── ORDER STATUS HELPERS ──────────────────────────────────
// Consolidated from Dashboard.jsx / OrdersList.jsx / PastOrders.jsx, which each had a
// slightly different copy of these. This version matches PastOrders' (the most correct one —
// it checks status === "archived" before evaluating delivery-based completion).
export function isNewOrder(o) {
  return !o.deliveryConfirmed && o.items.every(i => i.stageIndex === 0);
}

export function isPastOrder(o) {
  if (o.status === "archived") return true;
  if (!o.items.every(i => i.stageIndex === 8)) return false;
  const latest = o.items.reduce((a, i) => i.currentDelivery > a ? i.currentDelivery : a, "");
  if (!latest) return false;
  return (new Date() - new Date(latest)) / (1000 * 60 * 60 * 24) >= 10;
}

// Image src resolver — items may carry either a Cloudinary `url` or legacy base64 `data`.
// Centralised because this exact ternary was duplicated (and inconsistently applied — OrdersList
// was missing the `url` branch entirely, which silently broke thumbnails post-Cloudinary-migration).
export function firstItemImageSrc(item) {
  const img = item.images && item.images.length > 0 ? item.images[0] : null;
  if (!img) return null;
  return img.url || img.data || null;
}

// ── DELIVERY DATES ────────────────────────────────────────
// Delivery dates are stored in two formats: ISO "YYYY-MM-DD" (order form / date picker)
// and en-GB "15 Oct 2026" (written by "Log delay" in OrderDetail.jsx). Comparing them as
// strings or via new Date() gives wrong answers, so the dashboard reads them through these
// helpers, which accept both and need no data migration. Dates are read as local calendar days.
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDeliveryDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/);
  if (m) {
    const mi = MONTH_ABBR.findIndex(a => a.toLowerCase() === m[2].slice(0, 3).toLowerCase());
    if (mi >= 0) return new Date(+m[3], mi, +m[1]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDeliveryDate(date) {
  if (!date) return "\u2014";
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_ABBR[date.getMonth()]} ${date.getFullYear()}`;
}

export function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Latest expected delivery across an order's items, as a Date (or null).
export function latestDeliveryDate(order) {
  let best = null;
  for (const i of order.items) {
    const d = parseDeliveryDate(i.currentDelivery);
    if (d && (!best || d > best)) best = d;
  }
  return best;
}

// Whole days the order is past its expected delivery date (0 if not overdue). Looks at every
// item not yet delivered, uses the CURRENT date, and is NOT affected by whether the date was
// rescheduled before — unlike delayStatus(), which reports "delayed" for any rescheduled order
// even if the new date has also passed. An order is overdue the day AFTER its date.
export function daysOverdue(order, today = startOfToday()) {
  let worst = 0;
  for (const i of order.items) {
    if (i.stageIndex >= 8) continue;
    const due = parseDeliveryDate(i.currentDelivery);
    if (!due) continue;
    const late = Math.round((today - due) / DAY_MS);
    if (late > worst) worst = late;
  }
  return worst;
}

export function isOrderOverdue(order, today = startOfToday()) {
  return daysOverdue(order, today) > 0;
}

// ── ORDER STAGE + DASHBOARD GROUPING ──────────────────────
// An order is only as far along as its LEAST advanced item. This matches the Stage badge,
// the Stage sort and isPastOrder (every item delivered), and is used for the dashboard cards
// and stage filter so they always agree with what the table shows.
export function orderStage(order) {
  return order.items.length ? Math.min(...order.items.map(i => i.stageIndex)) : 0;
}

export function stageBucket(stageIndex) {
  if (stageIndex < 2) return "pending";
  if (stageIndex < 6) return "production";
  if (stageIndex < 8) return "dispatched";
  return "completed";
}

// ── NEEDS-ATTENTION GATES ─────────────────────────────────
// Items that cannot move forward until a person acts. Derived from the production workflow
// in OrderDetail.jsx (TrackerTab): vendor gate (0→1), raw-photo approval gate (stage 2),
// warehouse hold (stage 7), and a recorded QC fail. Overdue is handled separately.
export const ATTENTION_TYPES = {
  vendor:    { chip: "No vendor",    who: "Admin" },
  raw:       { chip: "Raw photos",   who: "QC / salesperson" },
  warehouse: { chip: "At warehouse", who: "Salesperson / admin" },
  qcfail:    { chip: "QC failed",    who: "Admin" },
};

// Returns one entry per gate type that applies to the order (aggregated across its items):
// { type, label, count, who, itemNames }
export function getOrderAttention(order) {
  const found = {};
  const add = (type, label, item) => {
    if (!found[type]) found[type] = { type, labels: new Set(), count: 0, itemNames: [] };
    found[type].labels.add(label);
    found[type].count += 1;
    found[type].itemNames.push(item.name || "Item");
  };
  for (const item of order.items) {
    const s = item.stageIndex;
    if (s === 0) add("vendor", "No vendor assigned", item);
    if (s === 2 && !item.rawPhotosApproved) {
      const hasPhotos = (item.rawPhotos || []).length > 0;
      add("raw", hasPhotos ? "Raw photos awaiting approval" : "Raw photos awaiting upload", item);
    }
    if (s === 7) add("warehouse", "At warehouse, awaiting customer", item);
    if (item.qcStatus === "fail" && s < 8) add("qcfail", "QC failed", item);
  }
  return Object.values(found).map(f => {
    const labels = [...f.labels];
    return {
      type: f.type,
      label: labels.length === 1 ? labels[0] : "Raw photos pending",
      count: f.count,
      who: ATTENTION_TYPES[f.type].who,
      itemNames: f.itemNames,
    };
  });
}

// Higher = more urgent. Overdue first (most days late first), then orders blocked at a gate,
// then everything else; within a tier, the nearest delivery date first.
export function urgencyScore(order, attention, today = startOfToday()) {
  const late = daysOverdue(order, today);
  let soonest = null;
  for (const i of order.items) {
    if (i.stageIndex >= 8) continue;
    const d = parseDeliveryDate(i.currentDelivery);
    if (d && (!soonest || d < soonest)) soonest = d;
  }
  const daysUntil = soonest ? Math.round((soonest - today) / DAY_MS) : 999;
  const nearness = 999 - Math.max(0, Math.min(999, daysUntil));
  if (late > 0) return 3000000 + Math.min(late, 999) * 1000 + nearness;
  if (attention.length > 0) return 2000000 + attention.length * 1000 + nearness;
  return 1000000 + nearness;
}
