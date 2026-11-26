// When is a deal due for a follow-up? Dates are plain YYYY-MM-DD strings in the user's local day
// (staff are in India, so local = IST), never run through UTC conversions that could shift the day.
//
// A deal with nextFollowUp uses it. Older deals have none, so they fall back to
// lastContacted (or the day they were created) + DEFAULT_GAP_DAYS. Deals nobody has touched for
// more than FADE_AFTER_DAYS past their due date drop out of Today into "Older" instead of piling up.

export const DEFAULT_GAP_DAYS = 3;
export const FADE_AFTER_DAYS = 14;

const ISO = /^\d{4}-\d{2}-\d{2}/;
const pad = n => String(n).padStart(2, "0");
const utc = s => { const [y, m, d] = s.slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmt = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
export function addDays(s, n) { return fmt(utc(s) + n * 86400000); }
// whole days from a to b (b later => positive)
export function dayDiff(a, b) { return Math.round((utc(b) - utc(a)) / 86400000); }

export function dueDate(deal) {
  if (deal.nextFollowUp && ISO.test(deal.nextFollowUp)) return deal.nextFollowUp.slice(0, 10);
  let base = null;
  if (deal.lastContacted && ISO.test(deal.lastContacted)) base = deal.lastContacted.slice(0, 10);
  else if (deal.createdAt) { const c = new Date(deal.createdAt); if (!isNaN(c)) base = todayStr(c); }
  return base ? addDays(base, DEFAULT_GAP_DAYS) : null;
}

// bucket: "today" (due today or overdue by up to FADE_AFTER_DAYS), "upcoming", or "older"
export function followUpState(deal, today = todayStr()) {
  const due = dueDate(deal);
  if (!due) return { due: null, overdueDays: 0, bucket: "older" };
  const overdueDays = dayDiff(due, today);
  const bucket = overdueDays < 0 ? "upcoming" : overdueDays > FADE_AFTER_DAYS ? "older" : "today";
  return { due, overdueDays, bucket };
}

export function dueLabel(state) {
  if (state.bucket === "upcoming") return `Due in ${-state.overdueDays} ${-state.overdueDays === 1 ? "day" : "days"}`;
  if (state.overdueDays === 0) return "Due today";
  if (!state.due) return "No follow-up date";
  return `${state.overdueDays} ${state.overdueDays === 1 ? "day" : "days"} overdue`;
}
