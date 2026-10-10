// ============================================================
// UniDoc Shared Types — Core interfaces used across MCP server,
// document engine, and frontend.
// ============================================================

// ─── University & Template Types ────────────────────────────

export interface UniversityFormatting {
  fontFamily: string;
  bodyFontSize: number;       // pt
  headingFontSize: number;    // pt
  subHeadingFontSize: number;// pt
  lineSpacing: number;        // 1.5, 2.0, etc.
  paragraphSpacingBefore: number; // pt
  paragraphSpacingAfter: number;  // pt
  margins: {
    top: number;    // mm
    right: number;
    bottom: number;
    left: number;
  };
  pageSize: "A4" | "Letter";
  orientation: "portrait" | "landscape";
}

export interface SectionDefinition {
  id: string;
  name: string;
  mandatory: boolean;
  order: number;
  hasTable?: boolean;
  description?: string;
}

export interface ApprovalStage {
  stage: string;
  approver: string;
  role: string;
  verified: boolean;
  notes?: string;
}

export interface UniversityProfile {
  id: string;           // "upm", "um", etc.
  name: string;          // "UPM"
  fullName: string;      // "Universiti Putra Malaysia"
  isVerified: boolean;
  formatting: UniversityFormatting;
  sections: SectionDefinition[];
  supportingDocuments: string[];
  approvalFlow: ApprovalStage[];
  notes?: string;
}

// ─── Event & Proposal Types ──────────────────────────────────

export interface Activity {
  time: string;          // "08:00 - 09:00"
  description: string;
  facilitator?: string;
}

export interface CommitteeMember {
  position: string;
  name: string;
  studentId?: string;
  faculty?: string;
}

export interface BudgetItem {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;     // RM
  total: number;         // RM — quantity * unitPrice
}

export interface EventDetails {
  title: string;
  university: string;    // university profile id
  organiser: string;     // club / society / faculty
  objectives: string[];
  startDate: string;     // ISO date
  endDate: string;       // ISO date
  venue: string;
  targetParticipants: number;
  activities: Activity[];
  budget: BudgetItem[];
  budgetLimit?: number;  // RM — max allowed
  committee: CommitteeMember[];
  expectedOutcomes: string[];
  // Optional fields that may be filled later
  background?: string;
  introduction?: string;
  conclusion?: string;
}

export interface ProposalSection {
  sectionId: string;
  title: string;
  content: string;       // Markdown or plain text
  subsections?: ProposalSection[];
  tableData?: string[][]; // rows of cells, first row = header
}

export interface Proposal {
  id: string;
  eventDetails: EventDetails;
  universityProfileId: string;
  sections: ProposalSection[];
  status: "draft" | "validated" | "exported" | "failed";
  createdAt: string;     // ISO timestamp
  updatedAt: string;     // ISO timestamp
}

// ─── Budget Types ────────────────────────────────────────────

export interface BudgetSummary {
  items: BudgetItem[];
  totalExpenditure: number;
  budgetLimit?: number;
  remaining?: number;
  overrun?: number;
}

export interface BudgetIssue {
  severity: "error" | "warning" | "info";
  itemIndex?: number;
  category: string;
  message: string;
  suggestion?: string;
}

export interface BudgetValidationResult {
  summary: BudgetSummary;
  issues: BudgetIssue[];
  status: "pass" | "fail" | "warning";
}

// ─── Validation & Repair Types ──────────────────────────────

export type IssueSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  section: string;
  severity: IssueSeverity;
  type: string;           // "missing_section", "budget_error", etc.
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

export interface RepairAction {
  section: string;
  issueType: string;
  description: string;
  applied: boolean;
  before?: string;
  after?: string;
}

export interface RepairResult {
  proposalId: string;
  actions: RepairAction[];
  remainingIssues: ValidationIssue[];
  status: "pass" | "partial" | "fail";
}

// ─── Custom Formatter Types ─────────────────────────────────

export interface CustomTemplate {
  id: string;
  name: string;
  description?: string;
  formatting: UniversityFormatting;
  sections: SectionDefinition[];
  createdAt: string;
  updatedAt: string;
}

// ─── Export Types ────────────────────────────────────────────

export type ExportFormat = "docx" | "markdown" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  outputPath?: string;
  customTemplateId?: string;
}

export interface ExportResult {
  proposalId: string;
  format: ExportFormat;
  filePath?: string;
  content?: string;       // for markdown
  success: boolean;
  message: string;
}

// ─── Tool Result Wrapper ────────────────────────────────────

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
