// ============================================================
// UniDoc Services — Barrel export of all reusable engine functions
// Both MCP server and HTTP backend import from here.
// This does NOT start the MCP server — it's a pure service layer.
// ============================================================

// University store
export {
  listUniversities,
  getUniversity,
  getUniversitySummary,
} from "./engine/university-store.js";

// Budget engine
export {
  calculateBudget,
  validateBudget,
  suggestBudgetAdjustments,
} from "./engine/budget-engine.js";

// Proposal builder
export { buildProposalSections } from "./engine/proposal-builder.js";

// Validator
export { validateProposal } from "./engine/validator.js";

// Repair engine
export { repairProposal } from "./engine/repair-engine.js";

// Markdown generator
export { generateMarkdown } from "./engine/markdown-generator.js";

// DOCX generator
export { generateDocx } from "./engine/docx-generator.js";

// Custom template store
export {
  createCustomTemplate,
  listCustomTemplates,
  getCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
} from "./engine/custom-template-store.js";

// ─── High-level service functions (for HTTP API convenience) ─

import type { EventDetails, UniversityProfile } from "@unidoc/shared";
import { getUniversity } from "./engine/university-store.js";
import { buildProposalSections } from "./engine/proposal-builder.js";
import { validateProposal } from "./engine/validator.js";
import { repairProposal } from "./engine/repair-engine.js";
import { generateMarkdown } from "./engine/markdown-generator.js";
import { generateDocx } from "./engine/docx-generator.js";

/**
 * Full end-to-end pipeline: generate → validate → repair → export.
 * Returns a structured result with execution trace.
 */
export async function runFullPipeline(
  eventDetails: EventDetails,
  universityId: string,
  options?: {
    customTemplateId?: string;
    exportFormat?: "docx" | "markdown";
    outputPath?: string;
  },
): Promise<{
  steps: Array<{ step: string; status: "success" | "partial" | "failed"; detail: string }>;
  proposal: ReturnType<typeof buildProposalSections>;
  validationReport: ReturnType<typeof validateProposal>;
  repairResult: ReturnType<typeof repairProposal> | null;
  exportPath?: string;
  exportContent?: string;
  overallStatus: "success" | "partial" | "failed";
}> {
  const steps: Array<{ step: string; status: "success" | "partial" | "failed"; detail: string }> = [];

  // Step 1: Load university profile
  const profile = getUniversity(universityId);
  if (!profile) {
    steps.push({ step: "load_profile", status: "failed", detail: `University "${universityId}" not found` });
    return {
      steps,
      proposal: [],
      validationReport: { proposalId: "", status: "fail", issues: [], totalIssues: 0, errorCount: 1, warningCount: 0 },
      repairResult: null,
      overallStatus: "failed",
    };
  }
  steps.push({ step: "load_profile", status: "success", detail: `Loaded ${profile.fullName}` });

  // Step 2: Generate proposal sections
  const sections = buildProposalSections(eventDetails, profile);
  steps.push({ step: "generate_proposal", status: "success", detail: `Generated ${sections.length} sections` });

  // Step 3: Validate
  const validationReport = validateProposal(eventDetails, profile, sections);
  validationReport.proposalId = `proposal-${Date.now()}`;
  steps.push({
    step: "validate_proposal",
    status: validationReport.status === "fail" ? "failed" : validationReport.status === "warning" ? "partial" : "success",
    detail: `${validationReport.errorCount} errors, ${validationReport.warningCount} warnings`,
  });

  // Step 4: Repair (if issues found)
  let repairResult: ReturnType<typeof repairProposal> | null = null;
  if (validationReport.issues.length > 0) {
    repairResult = repairProposal(eventDetails, profile, validationReport.issues);
    repairResult.proposalId = validationReport.proposalId;
    steps.push({
      step: "repair_proposal",
      status: repairResult.status === "pass" ? "success" : repairResult.status === "partial" ? "partial" : "failed",
      detail: `${repairResult.actions.length} actions applied, ${repairResult.remainingIssues.length} remaining`,
    });

    // Rebuild sections after repair
    const repairedSections = buildProposalSections(eventDetails, profile);
    sections.length = 0;
    sections.push(...repairedSections);
  }

  // Step 5: Export
  const format = options?.exportFormat || "docx";
  let exportPath: string | undefined;
  let exportContent: string | undefined;

  if (format === "markdown") {
    exportContent = generateMarkdown(sections, profile, eventDetails);
    exportPath = options?.outputPath || `output/${universityId}-${Date.now()}.md`;
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(exportPath), { recursive: true });
    writeFileSync(exportPath, exportContent, "utf-8");
    steps.push({ step: "export_document", status: "success", detail: `Exported markdown to ${exportPath}` });
  } else {
    exportPath = options?.outputPath || `output/${universityId}-${Date.now()}.docx`;
    const { mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    mkdirSync(dirname(exportPath), { recursive: true });
    await generateDocx(sections, profile, eventDetails, exportPath);
    steps.push({ step: "export_document", status: "success", detail: `Exported DOCX to ${exportPath}` });
  }

  const errorSteps = steps.filter((s) => s.status === "failed").length;
  const overallStatus = errorSteps > 0 ? (errorSteps === steps.length ? "failed" : "partial") : "success";

  return {
    steps,
    proposal: sections,
    validationReport,
    repairResult,
    exportPath,
    exportContent,
    overallStatus,
  };
}
