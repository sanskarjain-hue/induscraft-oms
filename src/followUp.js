// When is a deal due for a follow-up? Dates are plain YYYY-MM-DD strings in the user's local day
// (staff are in India, so local = IST), never run through UTC conversions that could shift the day.
//
// A deal with nextFollowUp uses it, and drops into "Older" once it is more than FADE_AFTER_DAYS past due.
// Older deals have none (saved before follow-up dates existed), so they fall back to lastContacted
// (or the day they were created) + DEFAULT_GAP_DAYS, and only stay on Today if that last contact was
// within LEGACY_WINDOW_DAYS. Anything older is archived into "Older" rather than flooding Today.

export const DEFAULT_GAP_DAYS = 3;
export const FADE_AFTER_DAYS = 14;
export const LEGACY_WINDOW_DAYS = 30;

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

function parts(deal) {
  if (deal.nextFollowUp && ISO.test(deal.nextFollowUp)) return { due: deal.nextFollowUp.slice(0, 10), legacy: false, base: null };
  let base = null;
  if (deal.lastContacted && ISO.test(deal.lastContacted)) base = deal.lastContacted.slice(0, 10);
  else if (deal.createdAt) { const c = new Date(deal.createdAt); if (!isNaN(c)) base = todayStr(c); }
  return { due: base ? addDays(base, DEFAULT_GAP_DAYS) : null, legacy: true, base };
}

export function dueDate(deal) { return parts(deal).due; }

// bucket: "today" (due today or overdue by up to FADE_AFTER_DAYS), "upcoming", or "older"
export function followUpState(deal, today = todayStr()) {
  const { due, legacy, base } = parts(deal);
  if (!due) return { due: null, overdueDays: 0, bucket: "older" };
  const overdueDays = dayDiff(due, today);
  let bucket;
  if (legacy) bucket = dayDiff(base, today) > LEGACY_WINDOW_DAYS ? "older" : overdueDays < 0 ? "upcoming" : "today";
  else bucket = overdueDays < 0 ? "upcoming" : overdueDays > FADE_AFTER_DAYS ? "older" : "today";
  return { due, overdueDays, bucket };
}

export function dueLabel(state) {
  if (state.bucket === "upcoming") return `Due in ${-state.overdueDays} ${-state.overdueDays === 1 ? "day" : "days"}`;
  if (state.overdueDays === 0) return "Due today";
  if (!state.due) return "No follow-up date";
  return `${state.overdueDays} ${state.overdueDays === 1 ? "day" : "days"} overdue`;
}
