const BASE_URL = "https://induscraft-backend.onrender.com/api";

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

// ── BASE FETCH ────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── AUTH ──────────────────────────────────────────────────
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
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch(`${BASE_URL}/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data; // { name, type, url, publicId }
}

export async function uploadMultipleFiles(files, folder = "general") {
  return Promise.all(Array.from(files).map(f => uploadFile(f, folder)));
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
