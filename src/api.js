// Falls back to the Render backend if VITE_API_URL is not set in Vercel.
const BASE_URL = (import.meta.env.VITE_API_URL || "https://induscraft-backend.onrender.com") + "/api";

// ── TOKEN MANAGEMENT ─────────────────────────────────────
export function getToken() {
  return localStorage.getItem("induscraft_token");
}

export function setToken(token) {
  localStorage.setItem("induscraft_token", token);
}

export function clearToken() {
  localStorage.removeItem("induscraft_token");
  localStorage.removeItem("induscraft_user");
}

export function getStoredUser() {
  const u = localStorage.getItem("induscraft_user");
  return u ? JSON.parse(u) : null;
}

export function setStoredUser(user) {
  localStorage.setItem("induscraft_user", JSON.stringify(user));
}

// ── ERRORS ────────────────────────────────────────────────
// Every failed request throws an ApiError with a message that is safe to show a
// person, plus flags the save queue uses to decide whether retrying makes sense.
export class ApiError extends Error {
  constructor(message, { status = 0, network = false, timeout = false, retryable = false, auth = false } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.network = network;
    this.timeout = timeout;
    this.retryable = retryable;
    this.auth = auth;
  }
}

function friendlyMessage(status, data) {
  if (status === 413) return "The request was too large to send.";
  if (data && data.error) return status >= 500 ? `Server error: ${data.error}` : data.error;
  if (status === 502 || status === 503 || status === 504)
    return "The server is starting up or temporarily unavailable. Trying again usually works.";
  return `Server error (${status}).`;
}

// ── "SERVER IS SLOW / WAKING UP" SIGNAL ───────────────────
// The Render free tier sleeps when idle and takes 30–60s to wake. Any request that
// is still waiting after a few seconds flips this signal on so the UI can say so,
// instead of looking frozen (which makes people click again or give up).
const SLOW_AFTER_MS = 3000;
const slowRequests = new Set();
let slowListener = null;

export function onServerSlow(fn) {
  slowListener = fn;
  return () => { if (slowListener === fn) slowListener = null; };
}

function beginRequest() {
  const token = {};
  const timer = setTimeout(() => {
    slowRequests.add(token);
    if (slowListener) slowListener(true);
  }, SLOW_AFTER_MS);
  return () => {
    clearTimeout(timer);
    if (slowRequests.delete(token) && slowRequests.size === 0 && slowListener) slowListener(false);
  };
}

// ── BASE FETCH ────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function requestOnce(path, options, { timeoutMs, isFormData }) {
  const token = getToken();
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const endSlowTracking = beginRequest();
  let res, text;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
    text = await res.text();
  } catch (e) {
    if (e && e.name === "AbortError") {
      throw new ApiError("The server took too long to respond.", { timeout: true, retryable: true });
    }
    throw new ApiError("Can't reach the server. Check your internet connection.", { network: true, retryable: true });
  } finally {
    clearTimeout(timer);
    endSlowTracking();
  }

  // The body is not always JSON (e.g. a gateway error page while the server wakes up).
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (res.status === 401) {
    if (path === "/auth/login") throw new ApiError((data && data.error) || "Incorrect username or password.", { status: 401 });
    clearToken();
    throw new ApiError("Your session has expired. Please sign in again.", { status: 401, auth: true });
  }
  if (!res.ok) {
    throw new ApiError(friendlyMessage(res.status, data), {
      status: res.status,
      retryable: res.status === 502 || res.status === 503 || res.status === 504,
    });
  }
  if (data === null && text) throw new ApiError("Unexpected response from the server.", { status: res.status });
  return data;
}

// Reads (GET) are retried automatically on transient failures. Writes are NOT
// retried here — the save queue (orderSync.js) owns write retries so a write is
// never silently sent twice.
async function apiFetch(path, options = {}, { timeoutMs = 90000, isFormData = false } = {}) {
  const maxRetries = (options.method || "GET").toUpperCase() === "GET" ? 2 : 0;
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestOnce(path, options, { timeoutMs, isFormData });
    } catch (e) {
      if (e.retryable && attempt < maxRetries) { await sleep(1500 * (attempt + 1)); continue; }
      throw e;
    }
  }
}

// ── SERVER WAKE-UP PING ───────────────────────────────────
// Fire-and-forget request to the health route so a sleeping server starts booting while
// the person is still typing their password. "no-cors" on purpose: we only care that the
// request reaches the server (and that it eventually answers), never about the body, so
// this works regardless of the backend's CORS list. Always resolves, never throws.
export function wakeServer() {
  const root = BASE_URL.replace(/\/api$/, "") + "/";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  return fetch(root, { mode: "no-cors", cache: "no-store", signal: controller.signal })
    .then(() => true, () => false)
    .finally(() => clearTimeout(timer));
}

// ── USER MANAGEMENT ───────────────────────────────────────
export async function fetchUsers() {
  return apiFetch("/auth/users");
}

export async function createUser(data) {
  return apiFetch("/auth/users", { method: "POST", body: JSON.stringify(data) });
}

export async function updateUser(id, data) {
  return apiFetch(`/auth/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteUser(id) {
  return apiFetch(`/auth/users/${id}`, { method: "DELETE" });
}

export async function changePassword(username, newPassword) {
  return apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ username, newPassword }),
  });
}

export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data.user;
}

export function logout() {
  clearToken();
}

// ── ORDERS ────────────────────────────────────────────────
export async function fetchNextOrderId(channel) {
  return apiFetch(`/orders/next-id?channel=${encodeURIComponent(channel)}`);
}

export async function fetchOrders(channel) {
  const params = channel ? `?channel=${channel}` : "";
  return apiFetch(`/orders${params}`);
}

export async function fetchAllOrders() {
  // includes archived — used for Past Orders page
  return apiFetch("/orders?includeArchived=true");
}

export async function fetchOrder(id) {
  return apiFetch(`/orders/${id}`);
}

export async function createOrder(orderData) {
  return apiFetch("/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
}

export async function updateOrder(id, orderData) {
  return apiFetch(`/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(orderData),
  });
}

// Permanently deletes an order. Distinct from archiving (updateOrder with status: "archived"),
// which is reversible. This is not — admin only, confirmed in the UI before calling.
export async function deleteOrder(id) {
  return apiFetch(`/orders/${id}`, { method: "DELETE" });
}

export async function advanceItemStage(orderId, itemId, data) {
  return apiFetch(`/orders/${orderId}/item/${itemId}/stage`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function assignVendor(orderId, itemId, data) {
  return apiFetch(`/orders/${orderId}/item/${itemId}/vendor`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function addFlag(orderId, itemId, flag) {
  return apiFetch(`/orders/${orderId}/item/${itemId}/flag`, {
    method: "PATCH",
    body: JSON.stringify(flag),
  });
}

export async function addPayment(orderId, payment) {
  return apiFetch(`/orders/${orderId}/payment`, {
    method: "PATCH",
    body: JSON.stringify(payment),
  });
}

export async function updateDispatch(orderId, details) {
  return apiFetch(`/orders/${orderId}/dispatch`, {
    method: "PATCH",
    body: JSON.stringify(details),
  });
}

export async function logDelay(orderId, itemId, data) {
  return apiFetch(`/orders/${orderId}/item/${itemId}/delay`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ── VENDORS ───────────────────────────────────────────────
export async function fetchVendors() {
  return apiFetch("/vendors");
}

export async function createVendor(vendorData) {
  return apiFetch("/vendors", {
    method: "POST",
    body: JSON.stringify(vendorData),
  });
}

export async function importVendors(vendors) {
  return apiFetch("/vendors/bulk", {
    method: "POST",
    body: JSON.stringify({ vendors }),
  });
}

export async function updateVendor(id, data) {
  return apiFetch(`/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── AFTER-SALES ───────────────────────────────────────────
export async function fetchServiceJobs() {
  return apiFetch("/aftersales/jobs");
}

export async function createServiceJob(data) {
  return apiFetch("/aftersales/jobs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateJobStatus(id, status) {
  return apiFetch(`/aftersales/jobs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchReplacements() {
  return apiFetch("/aftersales/replacements");
}

export async function createReplacement(data) {
  return apiFetch("/aftersales/replacements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── FILE UPLOAD ───────────────────────────────────────────
export async function uploadFile(file, folder = "general") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  // 120s: a large photo on a slow connection, or the server waking up.
  return apiFetch("/upload/image", { method: "POST", body: formData }, { timeoutMs: 120000, isFormData: true }); // { name, type, url, publicId }
}

export async function uploadMultipleFiles(files, folder = "general") {
  return Promise.all(Array.from(files).map(f => uploadFile(f, folder)));
}

// ── CUSTOMERS ─────────────────────────────────────────────
export async function lookupCustomer(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return apiFetch(`/customers?phone=${encodeURIComponent(digits)}`);
}

// ── DEALS / PIPELINE ─────────────────────────────────────
export async function fetchDeals() {
  return apiFetch("/deals");
}

export async function createDeal(data) {
  return apiFetch("/deals", { method: "POST", body: JSON.stringify(data) });
}

export async function updateDeal(id, data) {
  return apiFetch(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function addDealLog(id, text) {
  return apiFetch(`/deals/${id}/log`, { method: "POST", body: JSON.stringify({ text }) });
}

export async function deleteDeal(id) {
  return apiFetch(`/deals/${id}`, { method: "DELETE" });
}