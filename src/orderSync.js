// orderSync.js — the save engine for order edits.
//
// WHY THIS EXISTS
// Before this, every edit shipped a copy of the whole order built from whatever
// snapshot the component happened to be holding, and any failure was swallowed and
// shown as success. This module replaces that with three rules:
//
//   1. The server is the source of truth. The UI may show a change optimistically
//      while it is being saved, but if the save fails the change is REVERTED on
//      screen and HELD (so it can be retried or discarded) — never shown as saved.
//   2. A change is recorded as a small PATCH (which fields / which items changed),
//      computed at the moment the user acts, then re-applied on top of the latest
//      server-confirmed order when it is actually sent. A stale snapshot can no
//      longer overwrite newer data (photo uploads reverting stage changes, etc.).
//   3. Saves for the same order run one at a time, in order.
//
// This file has no React or browser dependencies so it can be tested in Node.

const IGNORED_KEYS = new Set([
  "_id", "id", "__v", "createdAt", "updatedAt", "editLog", "createdBy", "_editLogField",
]);

// item.id is the app's own id; older items only have Mongo's _id.
export function itemKey(item) {
  return item.id || item._id;
}

// Payments saved by the server only keep _id (the schema has no `id`); fresh
// local ones only have id.
export function paymentKey(p) {
  return p._id || p.id;
}

// JSON with sorted keys, so two objects with identical content but different key
// order compare equal.
export function stable(v) {
  if (v === undefined) return "undefined";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  const keys = Object.keys(v).filter(k => v[k] !== undefined).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
}

// ── PATCH: what did the user change? ─────────────────────────────────────────
// Compares `next` (what the UI built) against `base` (what the UI was showing when
// the user acted). Returns null if nothing changed.
export function computePatch(base, next) {
  const label = next._editLogField || null;
  const patch = { label, fields: {}, items: null, payments: null, newId: null };
  let any = false;

  if (next.id && next.id !== base.id) { patch.newId = next.id; any = true; }

  for (const key of Object.keys(next)) {
    if (IGNORED_KEYS.has(key)) continue;
    if (stable(next[key]) === stable(base[key])) continue;
    if (key === "items" && Array.isArray(next.items) && Array.isArray(base.items)) {
      patch.items = diffItems(base.items, next.items);
      if (patch.items) any = true;
    } else if (key === "payments" && Array.isArray(next.payments) && Array.isArray(base.payments)) {
      patch.payments = diffKeyed(base.payments, next.payments, paymentKey);
      if (patch.payments) any = true;
    } else {
      patch.fields[key] = next[key];
      any = true;
    }
  }
  return any ? patch : null;
}

function diffItems(baseItems, nextItems) {
  const baseByKey = new Map(baseItems.map(i => [itemKey(i), i]));
  const nextByKey = new Map(nextItems.map(i => [itemKey(i), i]));
  const ops = { add: [], remove: [], change: {} };
  for (const [k, item] of nextByKey) {
    const b = baseByKey.get(k);
    if (!b) { ops.add.push(item); continue; }
    const fields = {};
    const names = new Set([...Object.keys(item), ...Object.keys(b)]);
    for (const f of names) {
      if (f === "_id") continue;
      if (stable(item[f]) !== stable(b[f])) fields[f] = item[f];
    }
    if (Object.keys(fields).length) ops.change[k] = fields;
  }
  for (const k of baseByKey.keys()) if (!nextByKey.has(k)) ops.remove.push(k);
  return ops.add.length || ops.remove.length || Object.keys(ops.change).length ? ops : null;
}

function diffKeyed(baseArr, nextArr, keyFn) {
  const baseByKey = new Map(baseArr.map(e => [keyFn(e), e]));
  const nextByKey = new Map(nextArr.map(e => [keyFn(e), e]));
  const ops = { add: [], remove: [], replace: {} };
  for (const [k, e] of nextByKey) {
    const b = baseByKey.get(k);
    if (!b) ops.add.push(e);
    else if (stable(e) !== stable(b)) ops.replace[k] = e;
  }
  for (const k of baseByKey.keys()) if (!nextByKey.has(k)) ops.remove.push(k);
  return ops.add.length || ops.remove.length || Object.keys(ops.replace).length ? ops : null;
}

// ── APPLY: replay a patch on top of any order ───────────────────────────────
export function applyPatch(order, patch) {
  const out = { ...order, ...patch.fields };
  if (patch.newId) out.id = patch.newId;

  if (patch.items) {
    let items = [...(order.items || [])];
    const { add, remove, change } = patch.items;
    if (remove.length) items = items.filter(i => !remove.includes(itemKey(i)));
    items = items.map(i => (change[itemKey(i)] ? { ...i, ...change[itemKey(i)] } : i));
    for (const a of add) {
      const idx = items.findIndex(i => itemKey(i) === itemKey(a));
      if (idx >= 0) items[idx] = a; else items.push(a); // idempotent on retry
    }
    out.items = items;
  }

  if (patch.payments) {
    let list = [...(order.payments || [])];
    const { add, remove, replace } = patch.payments;
    if (remove.length) list = list.filter(p => !remove.includes(paymentKey(p)));
    list = list.map(p => (replace[paymentKey(p)] ? replace[paymentKey(p)] : p));
    for (const a of add) {
      const idx = list.findIndex(p => paymentKey(p) === paymentKey(a));
      if (idx >= 0) list[idx] = a; else list.push(a);
    }
    out.payments = list;
  }
  return out;
}

// The request body for PUT /orders/:id — only fields that actually differ from
// the latest server copy (plus id/_id and the edit-log label).
export function buildPayload(latest, merged, label) {
  const payload = {};
  let changed = false;
  for (const key of Object.keys(merged)) {
    if (IGNORED_KEYS.has(key)) continue;
    if (stable(merged[key]) !== stable(latest[key])) { payload[key] = merged[key]; changed = true; }
  }
  const renamed = merged.id !== latest.id;
  if (!changed && !renamed) return null;
  payload._id = merged._id;
  payload.id = merged.id; // server renames when this differs from the URL id
  if (label) payload.editLogEntry = { field: label };
  return payload;
}

// ── ERRORS ───────────────────────────────────────────────────────────────────
export function isRetryable(err) {
  return !!(err && (err.retryable || err.network || err.timeout));
}

// ── QUEUE ────────────────────────────────────────────────────────────────────
// One instance per app. Orders are keyed by Mongo `_id` (stable across renames).
export class OrderSaveQueue {
  constructor({ send, onChange, autoRetryDelaysMs = [4000, 8000], sleep } = {}) {
    this.send = send;                       // async (urlId, payload) => savedOrder
    this.onChange = onChange || (() => {});
    this.delays = autoRetryDelaysMs;
    this.sleep = sleep || (ms => new Promise(r => setTimeout(r, ms)));
    this.server = new Map();                // _id -> last server-confirmed order
    this.sequence = [];                     // _ids in list order
    this.jobs = [];                         // { seq, key, patch, state, error, resolve }
    this.seq = 0;
    this.running = new Set();
    this.retrying = new Set();
    this._cache = null;
  }

  // ----- server state -----
  setServerOrders(list) {
    this.server = new Map(list.map(o => [o._id, o]));
    this.sequence = list.map(o => o._id);
    this._emit();
  }
  upsertServer(order, { prepend = false } = {}) {
    if (!this.server.has(order._id)) prepend ? this.sequence.unshift(order._id) : this.sequence.push(order._id);
    this.server.set(order._id, order);
    this._emit();
  }
  // Used on sign-out: forget everything (including any held changes).
  reset() {
    this.server = new Map();
    this.sequence = [];
    this.jobs = [];
    this.retrying.clear();
    this._emit();
  }
  removeOrder(key) {
    this.server.delete(key);
    this.sequence = this.sequence.filter(k => k !== key);
    this.jobs = this.jobs.filter(j => j.key !== key);
    this._emit();
  }

  // ----- display: server copy + unsaved-but-in-flight changes -----
  display(key) {
    let o = this.server.get(key);
    if (!o) return undefined;
    for (const j of this.jobs) if (j.key === key && j.state !== "held") o = applyPatch(o, j.patch);
    return o;
  }
  displayList() {
    return this.sequence.map(k => this.display(k)).filter(Boolean);
  }

  // ----- enqueue -----
  // Returns { accepted, saved } — `saved` resolves true/false when the save finishes.
  enqueue(key, patch) {
    if (!patch) return { accepted: true, saved: Promise.resolve(true) };
    if (this.jobs.some(j => j.key === key && j.state === "held")) {
      return { accepted: false, blocked: true, saved: Promise.resolve(false) };
    }
    let resolve;
    const saved = new Promise(r => { resolve = r; });
    this.jobs.push({ seq: ++this.seq, key, patch, state: "queued", error: null, resolve });
    this._emit();
    this._pump(key);
    return { accepted: true, saved };
  }

  async _pump(key) {
    if (this.running.has(key)) return;
    this.running.add(key);
    try {
      for (;;) {
        const job = this.jobs.find(j => j.key === key && j.state === "queued");
        if (!job) break;
        job.state = "sending";
        this._emit();
        const ok = await this._attempt(job);
        if (ok) {
          this.jobs = this.jobs.filter(j => j !== job);
          job.resolve(true);
          this._emit();
        } else {
          // Hold this change and everything queued behind it for this order.
          for (const j of this.jobs) if (j.key === key && j.state !== "held") {
            j.state = "held";
            j.error = j === job ? job.error : (job.error || new Error("An earlier change could not be saved."));
          }
          for (const j of this.jobs) if (j.key === key && j.state === "held") j.resolve(false);
          this._emit();
          break;
        }
      }
    } finally {
      this.running.delete(key);
    }
  }

  async _attempt(job) {
    for (let attempt = 0; ; attempt++) {
      const latest = this.server.get(job.key);
      if (!latest) { job.error = new Error("This order no longer exists."); return false; }
      const merged = applyPatch(latest, job.patch);
      const payload = buildPayload(latest, merged, job.patch.label);
      if (!payload) return true;                      // already in the server copy
      try {
        const saved = await this.send(latest.id, payload);
        if (!saved || !saved._id) throw new Error("The server did not confirm the save.");
        this.server.set(job.key, saved);
        return true;
      } catch (err) {
        job.error = err;
        if (isRetryable(err) && attempt < this.delays.length) {
          this.retrying.add(job.key);
          this._emit();
          await this.sleep(this.delays[attempt]);
          this.retrying.delete(job.key);
          continue;
        }
        return false;
      }
    }
  }

  // ----- user actions on held changes -----
  retryHeld(key) {
    const keys = key ? [key] : [...new Set(this.jobs.filter(j => j.state === "held").map(j => j.key))];
    const promises = [];
    for (const k of keys) {
      for (const j of this.jobs.filter(x => x.key === k && x.state === "held")) {
        j.state = "queued"; j.error = null;
        promises.push(new Promise(r => { j.resolve = r; }));
      }
      this._pump(k);
    }
    this._emit();
    return Promise.all(promises);
  }
  discardHeld(key) {
    this.jobs = this.jobs.filter(j => !(j.state === "held" && (!key || j.key === key)));
    this._emit();
  }

  // ----- status for the UI -----
  status() {
    const saving = this.jobs.filter(j => j.state === "queued" || j.state === "sending").length;
    const held = this.jobs.filter(j => j.state === "held");
    const first = held.find(j => j.error);
    return {
      saving,
      retrying: this.retrying.size > 0,
      held: held.length,
      heldOrderIds: [...new Set(held.map(j => (this.server.get(j.key) || {}).id).filter(Boolean))],
      heldLabels: [...new Set(held.map(j => j.patch.label).filter(Boolean))],
      error: first ? (first.error.message || String(first.error)) : null,
    };
  }

  _emit() {
    this.onChange({ orders: this.displayList(), status: this.status() });
  }
}
