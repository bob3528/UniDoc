// ============================================================
// API Client — Frontend to Backend communication
// ============================================================

const API_BASE = "/api";

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }
  return data as T;
}

// ─── Types ───────────────────────────────────────────────────

export interface UniversitySummary {
  id: string;
  name: string;
  fullName: string;
  isVerified: boolean;
  sectionCount: number;
}

export interface AgentStep {
  step: number;
  type: "gemini_call" | "tool_call" | "tool_result" | "final" | "error";
  description: string;
  data?: unknown;
  timestamp: string;
}

export interface AgentResult {
  success: boolean;
  steps: AgentStep[];
  finalText?: string;
  exportPath?: string;
  proposal?: {
    id: string;
    eventDetails: EventDetails;
    universityProfileId: string;
    sections: ProposalSection[];
    status: string;
  };
  validationReport?: ValidationReport;
  repairResult?: RepairResult;
  error?: string;
  totalToolCalls: number;
  totalIterations: number;
}

export interface EventDetails {
  title: string;
  university: string;
  organiser: string;
  objectives: string[];
  startDate: string;
  endDate: string;
  venue: string;
  targetParticipants: number;
  activities: Array<{ time: string; description: string; facilitator?: string }>;
  budget: Array<{ category: string; description: string; quantity: number; unitPrice: number }>;
  budgetLimit?: number;
  committee: Array<{ position: string; name: string; studentId?: string; faculty?: string }>;
  expectedOutcomes: string[];
  background?: string;
  introduction?: string;
  conclusion?: string;
}

export interface ProposalSection {
  sectionId: string;
  title: string;
  content: string;
  tableData?: string[][];
}

export interface ValidationIssue {
  section: string;
  severity: "error" | "warning" | "info";
  type: string;
  message: string;
  suggestion: string;
}

export interface ValidationReport {
  proposalId: string;
  status: "pass" | "fail" | "warning";
  issues: ValidationIssue[];
  totalIssues: number;
  errorCount: number;
  warningCount: number;
}

export interface RepairResult {
  proposalId: string;
  actions: Array<{ section: string; issueType: string; description: string; applied: boolean }>;
  remainingIssues: ValidationIssue[];
  status: "pass" | "partial" | "fail";
}

// ─── API Functions ───────────────────────────────────────────

export const api = {
  getUniversities: () =>
    apiCall<{ success: boolean; count: number; universities: UniversitySummary[] }>("/universities"),

  getUniversity: (id: string) =>
    apiCall<{ success: boolean; university: any }>(`/universities/${id}`),

  generateProposal: (eventDetails: EventDetails, universityId: string) =>
    apiCall<{ success: boolean; proposal: any }>("/proposal/generate", {
      method: "POST",
      body: JSON.stringify({ eventDetails, universityId }),
    }),

  validateProposal: (eventDetails: EventDetails, universityId: string) =>
    apiCall<{ success: boolean; report: ValidationReport }>("/proposal/validate", {
      method: "POST",
      body: JSON.stringify({ eventDetails, universityId }),
    }),

  repairProposal: (eventDetails: EventDetails, universityId: string, issues: ValidationIssue[]) =>
    apiCall<{ success: boolean; result: RepairResult; repairedSections: ProposalSection[] }>("/proposal/repair", {
      method: "POST",
      body: JSON.stringify({ eventDetails, universityId, validationIssues: issues }),
    }),

  calculateBudget: (items: any[], budgetLimit?: number) =>
    apiCall<{ success: boolean; summary: any }>("/budget/calculate", {
      method: "POST",
      body: JSON.stringify({ budgetItems: items, budgetLimit }),
    }),

  validateBudget: (items: any[], budgetLimit?: number) =>
    apiCall<{ success: boolean; result: any }>("/budget/validate", {
      method: "POST",
      body: JSON.stringify({ budgetItems: items, budgetLimit }),
    }),

  exportDocument: (eventDetails: EventDetails, universityId: string, format: "docx" | "markdown") =>
    apiCall<{ success: boolean; format: string; filePath: string; content?: string }>("/export", {
      method: "POST",
      body: JSON.stringify({ eventDetails, universityId, format }),
    }),

  getApproval: (universityId: string) =>
    apiCall<{ success: boolean; checklist: any[]; supportingDocuments: string[]; isVerified: boolean }>(`/approval/${universityId}`),

  getTemplates: () =>
    apiCall<{ success: boolean; count: number; templates: any[] }>("/templates"),

  createTemplate: (template: { name: string; description?: string; formatting: any; sections: any[] }) =>
    apiCall<{ success: boolean; template: any }>("/templates", {
      method: "POST",
      body: JSON.stringify(template),
    }),

  runAgent: (prompt: string) =>
    apiCall<AgentResult>("/agent", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  getGeminiStatus: () =>
    apiCall<{ available: boolean; model: string }>("/gemini/status"),

  downloadFile: (filename: string) => {
    window.open(`${API_BASE}/download/${filename}`, "_blank");
  },
};
