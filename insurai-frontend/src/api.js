// ─── FULLY MOCKED API — works without any backend ─────────────────────────────

const delay = (ms = 600) => new Promise(r => setTimeout(r, ms));

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  { id: "usr-001", email: "rahul@company.com",  password: "customer123", fullName: "Rahul Mehta",   roles: ["CUSTOMER"] },
  { id: "usr-002", email: "priya@insurai.com",   password: "under123",    fullName: "Priya Nair",    roles: ["UNDERWRITER"] },
  { id: "usr-003", email: "vikram@insurai.com",  password: "claims123",   fullName: "Vikram Rao",    roles: ["CLAIMS_ADJUSTER"] },
  { id: "usr-004", email: "aryan@insurai.com",   password: "admin123",    fullName: "Aryan Sharma",  roles: ["ADMIN"] },
  { id: "usr-005", email: "neha@insurai.com",    password: "ai123",       fullName: "Neha Gupta",    roles: ["AI_ANALYST"] },
];

const MOCK_POLICIES = [
  { id: "pol-001", policyNumber: "POL-2025-0303", holderName: "Rahul Mehta",    holderId: "usr-001", policyType: "CORPORATE_HEALTH", status: "ACTIVE",         premiumAmount: 24000,   coverageAmount: 2500000,  startDate: "2025-01-01", endDate: "2025-12-31", riskScore: 22, aiRecommendation: "APPROVE" },
  { id: "pol-002", policyNumber: "POL-2025-0189", holderName: "Rahul Mehta",    holderId: "usr-001", policyType: "TERM_LIFE",        status: "ACTIVE",         premiumAmount: 18500,   coverageAmount: 5000000,  startDate: "2025-01-01", endDate: "2026-03-31", riskScore: 15, aiRecommendation: "APPROVE" },
  { id: "pol-003", policyNumber: "POL-2025-0091", holderName: "Rahul Mehta",    holderId: "usr-001", policyType: "VEHICLE",          status: "ACTIVE",         premiumAmount: 8200,    coverageAmount: 500000,   startDate: "2025-01-01", endDate: "2026-01-31", riskScore: 38, aiRecommendation: "APPROVE" },
  { id: "pol-004", policyNumber: "POL-2025-0839", holderName: "Nexova Systems", holderId: "usr-002", policyType: "FIRE_HAZARD",      status: "PENDING_REVIEW", premiumAmount: 880000,  coverageAmount: 25000000, startDate: "2025-04-01", endDate: "2026-03-31", riskScore: 67, aiRecommendation: "MANUAL_REVIEW" },
  { id: "pol-005", policyNumber: "POL-2025-0822", holderName: "Arcturus Group", holderId: "usr-002", policyType: "MARINE_CARGO",     status: "PENDING_REVIEW", premiumAmount: 1860000, coverageAmount: 50000000, startDate: "2025-04-01", endDate: "2026-03-31", riskScore: 84, aiRecommendation: "ESCALATE" },
  { id: "pol-006", policyNumber: "POL-2025-0811", holderName: "Veridian Corp.", holderId: "usr-002", policyType: "GROUP_LIFE",       status: "PENDING_REVIEW", premiumAmount: 2200000, coverageAmount: 100000000,startDate: "2025-04-01", endDate: "2026-03-31", riskScore: 45, aiRecommendation: "APPROVE" },
  { id: "pol-007", policyNumber: "POL-2025-0841", holderName: "Meridian Global",holderId: "usr-002", policyType: "CORPORATE_HEALTH", status: "APPROVED",       premiumAmount: 1240000, coverageAmount: 50000000, startDate: "2025-03-01", endDate: "2026-02-28", riskScore: 32, aiRecommendation: "APPROVE" },
  { id: "pol-008", policyNumber: "POL-2025-0800", holderName: "Orion Dynamics", holderId: "usr-002", policyType: "CYBER_RISK",       status: "PENDING_REVIEW", premiumAmount: 650000,  coverageAmount: 20000000, startDate: "2025-04-01", endDate: "2026-03-31", riskScore: 71, aiRecommendation: "ESCALATE" },
];

const MOCK_CLAIMS = [
  { id: "clm-001", claimNumber: "CLM-0044", policyId: "pol-001", policyNumber: "POL-2025-0303", holderId: "usr-001", holderName: "Rahul Mehta",    claimType: "MEDICAL_EXPENSE",  status: "APPROVED",     claimedAmount: 45000,   approvedAmount: 45000,  fraudScore: 12, fraudVerdict: "LOW_RISK",   incidentDate: "2025-02-10", filedAt: "2025-02-10" },
  { id: "clm-002", claimNumber: "CLM-0039", policyId: "pol-001", policyNumber: "POL-2025-0303", holderId: "usr-001", holderName: "Rahul Mehta",    claimType: "MEDICAL_EXPENSE",  status: "UNDER_REVIEW", claimedAmount: 12000,   approvedAmount: null,   fraudScore: 21, fraudVerdict: "LOW_RISK",   incidentDate: "2025-01-18", filedAt: "2025-01-18" },
  { id: "clm-003", claimNumber: "CLM-0091", policyId: "pol-005", policyNumber: "POL-2025-0822", holderId: "usr-003", holderName: "Arcturus Group", claimType: "MARINE_DAMAGE",    status: "FRAUD_REVIEW", claimedAmount: 4800000, approvedAmount: null,   fraudScore: 87, fraudVerdict: "HIGH_RISK",  incidentDate: "2025-02-15", filedAt: "2025-02-20" },
  { id: "clm-004", claimNumber: "CLM-0085", policyId: "pol-007", policyNumber: "POL-2025-0835", holderId: "usr-003", holderName: "Crestline Tech", claimType: "PUBLIC_LIABILITY", status: "INVESTIGATION",claimedAmount: 1200000, approvedAmount: null,   fraudScore: 52, fraudVerdict: "MEDIUM_RISK",incidentDate: "2025-02-05", filedAt: "2025-02-08" },
  { id: "clm-005", claimNumber: "CLM-0082", policyId: "pol-007", policyNumber: "POL-2025-0841", holderId: "usr-003", holderName: "Meridian Global",claimType: "EMPLOYEE_HEALTH",  status: "UNDER_REVIEW", claimedAmount: 240000,  approvedAmount: null,   fraudScore: 18, fraudVerdict: "LOW_RISK",   incidentDate: "2025-02-01", filedAt: "2025-02-03" },
  { id: "clm-006", claimNumber: "CLM-0079", policyId: "pol-006", policyNumber: "POL-2025-0811", holderId: "usr-003", holderName: "Veridian Corp.", claimType: "GROUP_MEDICAL",    status: "APPROVED",     claimedAmount: 180000,  approvedAmount: 180000, fraudScore: 9,  fraudVerdict: "LOW_RISK",   incidentDate: "2025-01-25", filedAt: "2025-01-28" },
];

const MOCK_WORKFLOWS = [
  { id: "wf-001", policyId: "pol-004", policyNumber: "POL-2025-0839", holderName: "Nexova Systems",  policyType: "FIRE_HAZARD",  status: "IN_REVIEW",  riskScore: 67, aiRecommendation: "MANUAL_REVIEW", assignedTo: "usr-002", assigneeName: "Priya Nair",  submittedDate: "28 Feb" },
  { id: "wf-002", policyId: "pol-005", policyNumber: "POL-2025-0822", holderName: "Arcturus Group",  policyType: "MARINE_CARGO", status: "ESCALATED",  riskScore: 84, aiRecommendation: "ESCALATE",       assignedTo: "usr-002", assigneeName: "Rahul Menon", submittedDate: "26 Feb" },
  { id: "wf-003", policyId: "pol-006", policyNumber: "POL-2025-0811", holderName: "Veridian Corp.",  policyType: "GROUP_LIFE",   status: "IN_REVIEW",  riskScore: 45, aiRecommendation: "APPROVE",         assignedTo: "usr-002", assigneeName: "Shreya Das",  submittedDate: "25 Feb" },
  { id: "wf-004", policyId: "pol-008", policyNumber: "POL-2025-0800", holderName: "Orion Dynamics",  policyType: "CYBER_RISK",   status: "ESCALATED",  riskScore: 71, aiRecommendation: "ESCALATE",       assignedTo: null,      assigneeName: "Unassigned",  submittedDate: "24 Feb" },
];

const MOCK_RENEWALS = [
  { id: "ren-001", policyId: "pol-001", policyNumber: "POL-2025-0303", holderName: "Rahul Mehta", expiryDate: "2025-12-31", renewalStatus: "PENDING", daysRemaining: 293, quotes: [{ id: "q-001", quotedPremium: 25200, discountPercent: 0, validUntil: "2025-04-01" }] },
];

const MOCK_RULES = [
  { id: "rul-001", ruleCode: "RUL-001", name: "Eligibility Check",        triggerEvent: "POLICY_CREATED",    status: "ACTIVE" },
  { id: "rul-002", ruleCode: "RUL-002", name: "IRDAI Compliance Check",   triggerEvent: "POLICY_APPROVED",   status: "ACTIVE" },
  { id: "rul-003", ruleCode: "RUL-003", name: "High Risk Auto-Escalate",  triggerEvent: "RISK_SCORE_GT_70",  status: "ACTIVE" },
  { id: "rul-004", ruleCode: "RUL-004", name: "Auto-Renewal Reminder",    triggerEvent: "EXPIRY_30D",        status: "DRAFT"  },
];

// ─── In-memory state (survives page without reload) ───────────────────────────
let _policies = [...MOCK_POLICIES];
let _claims   = [...MOCK_CLAIMS];
let _users    = [...MOCK_USERS];
let _token    = localStorage.getItem("insurai_token") || "";
let _currentUser = null;

try {
  const stored = localStorage.getItem("insurai_user");
  if (stored) _currentUser = JSON.parse(stored);
} catch (_) {}

// ─── Token helpers ────────────────────────────────────────────────────────────
export function setToken(t) {
  _token = t || "";
  if (t) localStorage.setItem("insurai_token", t);
  else localStorage.removeItem("insurai_token");
}

export function getToken() {
  return _token;
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

// ─── Mock API ─────────────────────────────────────────────────────────────────
export const api = {

  // AUTH
  async login(email, password) {
    await delay(800);
    const user = _users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid email or password");
    const token = `mock-jwt-${user.id}-${Date.now()}`;
    setToken(token);
    _currentUser = user;
    localStorage.setItem("insurai_user", JSON.stringify(user));
    localStorage.setItem("insurai_refresh", "mock-refresh-token");
    return {
      accessToken: token,
      refreshToken: "mock-refresh-token",
      expiresIn: 86400000,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles: user.roles },
    };
  },

  async register(email, password, fullName, role = "CUSTOMER") {
    await delay(900);
    if (_users.find(u => u.email === email)) throw new Error("Email already registered");
    const newUser = {
      id: `usr-${Date.now()}`,
      email, password, fullName,
      roles: [role],
    };
    _users.push(newUser);
    const token = `mock-jwt-${newUser.id}-${Date.now()}`;
    setToken(token);
    _currentUser = newUser;
    localStorage.setItem("insurai_user", JSON.stringify(newUser));
    return {
      accessToken: token,
      refreshToken: "mock-refresh-token",
      expiresIn: 86400000,
      user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName, roles: newUser.roles },
    };
  },

  async logout() {
    await delay(300);
    setToken("");
    _currentUser = null;
    localStorage.removeItem("insurai_user");
    localStorage.removeItem("insurai_refresh");
  },

  // POLICIES
  async getPoliciesMy() {
    await delay(500);
    const user = _currentUser || JSON.parse(localStorage.getItem("insurai_user") || "{}");
    return _policies.filter(p => p.holderId === user.id);
  },

  async createPolicy(body) {
    await delay(1000);
    const user = _currentUser || JSON.parse(localStorage.getItem("insurai_user") || "{}");
    const riskScore = Math.floor(Math.random() * 60) + 20;
    const rec = riskScore < 40 ? "APPROVE" : riskScore < 70 ? "MANUAL_REVIEW" : "ESCALATE";
    const newPolicy = {
      id: `pol-${Date.now()}`,
      policyNumber: `POL-2025-${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`,
      holderId: user.id,
      holderName: user.fullName,
      status: "PENDING_REVIEW",
      riskScore,
      aiRecommendation: rec,
      premiumAmount: Math.floor((body.coverageAmount || 1000000) * 0.02),
      ...body,
    };
    _policies.push(newPolicy);
    return newPolicy;
  },

  async getPolicy(id) {
    await delay(400);
    return _policies.find(p => p.id === id) || null;
  },

  async updatePolicyStatus(id, status, reason) {
    await delay(600);
    const p = _policies.find(p => p.id === id);
    if (p) { p.status = status; p.statusReason = reason; }
    return p;
  },

  async getAllPolicies() {
    await delay(500);
    return _policies;
  },

  // CLAIMS
  async getClaimsMy() {
    await delay(500);
    const user = _currentUser || JSON.parse(localStorage.getItem("insurai_user") || "{}");
    return _claims.filter(c => c.holderId === user.id);
  },

  async createClaim(formData) {
    await delay(1000);
    const user = _currentUser || JSON.parse(localStorage.getItem("insurai_user") || "{}");
    const fraudScore = Math.floor(Math.random() * 40) + 5;
    const verdict = fraudScore < 30 ? "LOW_RISK" : fraudScore < 60 ? "MEDIUM_RISK" : "HIGH_RISK";
    const newClaim = {
      id: `clm-${Date.now()}`,
      claimNumber: `CLM-${String(Math.floor(Math.random() * 900) + 100).padStart(4, "0")}`,
      holderId: user.id,
      holderName: user.fullName,
      policyNumber: formData.get ? formData.get("policyId") : formData.policyId,
      policyId: formData.get ? formData.get("policyId") : formData.policyId,
      claimType: formData.get ? formData.get("claimType") : formData.claimType,
      claimedAmount: parseFloat(formData.get ? formData.get("claimedAmount") : formData.claimedAmount),
      incidentDate: formData.get ? formData.get("incidentDate") : formData.incidentDate,
      description: formData.get ? formData.get("description") : formData.description,
      status: "SUBMITTED",
      fraudScore,
      fraudVerdict: verdict,
      filedAt: new Date().toISOString(),
    };
    _claims.push(newClaim);
    return newClaim;
  },

  async getClaims(params = {}) {
    await delay(500);
    let result = [..._claims];
    if (params.status) result = result.filter(c => params.status.includes(c.status));
    if (params.fraudVerdict) result = result.filter(c => c.fraudVerdict === params.fraudVerdict);
    return result;
  },

  async updateClaimStatus(id, status, approvedAmount, note) {
    await delay(600);
    const c = _claims.find(c => c.id === id);
    if (c) { c.status = status; if (approvedAmount) c.approvedAmount = approvedAmount; c.note = note; }
    return c;
  },

  // WORKFLOWS
  async getWorkflowsMyQueue() {
    await delay(500);
    return MOCK_WORKFLOWS;
  },

  async getWorkflows(params = {}) {
    await delay(500);
    return MOCK_WORKFLOWS;
  },

  async getWorkflowByPolicy(policyId) {
    await delay(400);
    return MOCK_WORKFLOWS.find(w => w.policyId === policyId) || null;
  },

  async workflowDecision(id, decision, notes) {
    await delay(700);
    const w = MOCK_WORKFLOWS.find(w => w.id === id);
    if (w) w.status = decision === "APPROVED" ? "APPROVED" : decision === "REJECTED" ? "REJECTED" : "ESCALATED";
    return w;
  },

  // RENEWALS
  async getRenewalsMy() {
    await delay(500);
    return MOCK_RENEWALS;
  },

  async getRenewal(id) {
    await delay(400);
    return MOCK_RENEWALS.find(r => r.id === id) || null;
  },

  async acceptRenewalQuote(renewalId, quoteId) {
    await delay(800);
    return { success: true, message: "Renewal accepted successfully" };
  },

  // AI ASSISTANT
  async chatAssistant(message, conversationId) {
    await delay(1200);
    const msg = message.toLowerCase();
    let reply = "I can help you with your insurance policies and claims. Could you be more specific?";

    if (msg.includes("coverage") || msg.includes("limit"))
      reply = "Your Family Health policy POL-2025-0303 has a coverage limit of ₹25 Lakh. Your Term Life policy POL-2025-0189 covers ₹50 Lakh.";
    else if (msg.includes("claim") && msg.includes("status"))
      reply = "Your claim CLM-0039 is currently under review. Expected resolution in 3 business days. Claim CLM-0044 was approved on 15 Feb 2025.";
    else if (msg.includes("premium"))
      reply = "Your total annual premium across all policies is ₹50,700. Family Health: ₹24,000, Term Life: ₹18,500, Vehicle: ₹8,200.";
    else if (msg.includes("renew") || msg.includes("expir"))
      reply = "Your Family Health policy POL-2025-0303 expires on Dec 31, 2025 — 293 days remaining. I can initiate a renewal quote for you.";
    else if (msg.includes("risk"))
      reply = "Your current risk scores are: Family Health — 22 (Low), Term Life — 15 (Low), Vehicle — 38 (Low). All policies are in good standing.";
    else if (msg.includes("hello") || msg.includes("hi"))
      reply = "👋 Hi! I'm your InsurAI assistant. I can help you with policy details, claim status, renewals, and more. What would you like to know?";

    return { reply, conversationId: conversationId || "conv-001", sources: ["policy-data"] };
  },

  // USERS (Admin)
  async getUsers() {
    await delay(500);
    return _users.map(u => ({ id: u.id, email: u.email, fullName: u.fullName, roles: u.roles, status: "ACTIVE" }));
  },

  async createUser(body) {
    await delay(700);
    const newUser = { id: `usr-${Date.now()}`, password: "welcome123", status: "ACTIVE", ...body };
    _users.push(newUser);
    return newUser;
  },

  // RULES
  async getRules() {
    await delay(400);
    return MOCK_RULES;
  },
};