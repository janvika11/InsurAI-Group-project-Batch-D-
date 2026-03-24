// ─── REAL BACKEND API — connects to http://localhost:8080 ─────────────────────

const BASE_URL = "";

// ─── Token helpers ────────────────────────────────────────────────────────────
export function setToken(t) {
  if (t) localStorage.setItem("insurai_token", t);
  else localStorage.removeItem("insurai_token");
}

export function getToken() {
  return localStorage.getItem("insurai_token") || "";
}

// ─── Role helper ──────────────────────────────────────────────────────────────
export function roleToPortal(roles) {
  if (!roles?.length) return "customer";
  const r = roles[0];
  if (r === "ADMIN") return "admin";
  if (r === "UNDERWRITER") return "underwriter";
  if (r === "CLAIMS_ADJUSTER") return "claims";
  if (r === "AI_ANALYST") return "ai";
  return "customer";
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function request(method, path, body = null, isFormData = false) {
  const token = getToken();
  const headers = {};

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  if (res.status === 401) {
    // Try refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`;
      const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      if (!retry.ok) throw new Error(await retry.text());
      return retry.json().catch(() => ({}));
    } else {
      localStorage.clear();
      window.location.href = "/";
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = errText;
    try { errMsg = JSON.parse(errText)?.message || errText; } catch (_) {}
    throw new Error(errMsg || `Request failed: ${res.status}`);
  }

  return res.json().catch(() => ({}));
}

async function tryRefresh() {
  try {
    const refreshToken = localStorage.getItem("insurai_refresh");
    if (!refreshToken) return false;
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem("insurai_refresh", data.refreshToken);
    return true;
  } catch (_) {
    return false;
  }
}

const get  = (path)        => request("GET",    path);
const post = (path, body, isFormData = false) => request("POST", path, body, isFormData);
const put  = (path, body)  => request("PUT",    path, body);
const del  = (path)        => request("DELETE", path);

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// ─── Real API ─────────────────────────────────────────────────────────────────
export const api = {

  // ── AUTH ────────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await post("/api/auth/login", { email, password });
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem("insurai_refresh", data.refreshToken);
    // Store user info
    const user = data.user || { email, roles: data.roles || ["CUSTOMER"] };
    localStorage.setItem("insurai_user", JSON.stringify(user));
    return data;
  },

  async register(email, password, fullName, role = "CUSTOMER") {
    const data = await post("/api/auth/register", { email, password, fullName, role });
    setToken(data.accessToken);
    if (data.refreshToken) localStorage.setItem("insurai_refresh", data.refreshToken);
    const user = data.user || { email, fullName, roles: [role] };
    localStorage.setItem("insurai_user", JSON.stringify(user));
    return data;
  },

  async logout() {
    try { await post("/api/auth/logout", {}); } catch (_) {}
    setToken("");
    localStorage.removeItem("insurai_user");
    localStorage.removeItem("insurai_refresh");
  },

  // ── POLICIES ────────────────────────────────────────────────────────────────
  async getPoliciesMy() {
    const data = await get("/api/policies/my");
    return asArray(data);
  },

  async getAllPolicies() {
    const data = await get("/api/policies");
    return asArray(data);
  },

  async getPolicy(id) {
    return get(`/api/policies/${id}`);
  },

  async createPolicy(body) {
    return post("/api/policies", body);
  },

  async updatePolicyStatus(id, status, reason) {
    return put(`/api/policies/${id}/status`, { status, reason });
  },

  async getPolicyTemplates() {
    return get("/api/policy-templates");
  },

  // ── CLAIMS ──────────────────────────────────────────────────────────────────
  async getClaimsMy() {
    const data = await get("/api/claims/my");
    return asArray(data);
  },

  async getClaims(params = {}) {
    const query = new URLSearchParams(params).toString();
    const data = await get(`/api/claims${query ? "?" + query : ""}`);
    return asArray(data);
  },

  async getClaim(id) {
    return get(`/api/claims/${id}`);
  },

  async createClaim(formData) {
    // formData should be a FormData object (multipart for file upload)
    return post("/api/claims", formData, true);
  },

  async updateClaimStatus(id, status, approvedAmount, note) {
    return put(`/api/claims/${id}/status`, { status, approvedAmount, note });
  },

  // ── WORKFLOWS ───────────────────────────────────────────────────────────────
  async getWorkflows(params = {}) {
    const query = new URLSearchParams(params).toString();
    const data = await get(`/api/workflows${query ? "?" + query : ""}`);
    return asArray(data);
  },

  async getWorkflowsMyQueue() {
    const data = await get("/api/workflows/my-queue");
    return asArray(data);
  },

  async getWorkflowByPolicy(policyId) {
    return get(`/api/workflows/policy/${policyId}`);
  },

  async workflowDecision(id, decision, notes) {
    return put(`/api/workflows/${id}/decision`, { decision, notes });
  },

  async assignWorkflow(id, assigneeId) {
    return put(`/api/workflows/${id}/assign`, { assigneeId });
  },

  // ── RENEWALS ────────────────────────────────────────────────────────────────
  async getRenewalsMy() {
    const data = await get("/api/renewals/my");
    return asArray(data);
  },

  async getRenewals() {
    const data = await get("/api/renewals");
    return asArray(data);
  },

  async getRenewal(id) {
    return get(`/api/renewals/${id}`);
  },

  async getRenewalQuotes(id) {
    return get(`/api/renewals/${id}/quotes`);
  },

  async acceptRenewalQuote(renewalId, quoteId) {
    return post(`/api/renewals/${renewalId}/accept-quote?quoteId=${encodeURIComponent(quoteId)}`);
  },

  // ── RULES ───────────────────────────────────────────────────────────────────
  async getRules() {
    return get("/api/rules");
  },

  async getRule(id) {
    return get(`/api/rules/${id}`);
  },

  async createRule(body) {
    return post("/api/rules", body);
  },

  // ── USERS (Admin) ───────────────────────────────────────────────────────────
  async getUsers() {
    return get("/api/users");
  },

  async getUser(id) {
    return get(`/api/users/${id}`);
  },

  async createUser(body) {
    return post("/api/users", body);
  },

  async updateUserRoles(id, roles) {
    return put(`/api/users/${id}/roles`, roles);
  },

  // ── NOTIFICATIONS ───────────────────────────────────────────────────────────
  async getNotificationPreferences() {
    return get("/api/notifications/preferences");
  },

  async updateNotificationPreferences(body) {
    return put("/api/notifications/preferences", body);
  },

  // ── AI SERVICES ─────────────────────────────────────────────────────────────
  async chatAssistant(message, conversationId) {
    const storedUser = JSON.parse(localStorage.getItem("insurai_user") || "{}");
    const userId = storedUser?.id || "web-user";
    return post("/api/ai/assistant/chat", { userId, message, conversationId });
  },

  async getAIRiskHealth() {
    return get("/api/ai/risk/health");
  },

  async getAIDocumentHealth() {
    return get("/api/ai/documents/health");
  },

  async getAIAssistantHealth() {
    return get("/api/ai/assistant/health");
  },

  async getAIFraudHealth() {
    return get("/api/ai/fraud/health");
  },

  async detectFraud(body) {
    return post("/api/ai/fraud/detect", body);
  },
};