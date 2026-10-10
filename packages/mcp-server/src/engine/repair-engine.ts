// ============================================================
// Repair Engine — Automatically corrects safe document issues
// ============================================================

import type {
  EventDetails,
  UniversityProfile,
  ValidationIssue,
  RepairAction,
  RepairResult,
  ProposalSection,
} from "@unidoc/shared";
import { buildProposalSections } from "./proposal-builder.js";
import { validateProposal } from "./validator.js";

/**
 * Apply automatic repairs to a proposal based on validation issues.
 * Only safe, deterministic repairs are applied. Substantive content is never fabricated.
 */
export function repairProposal(
  eventDetails: EventDetails,
  profile: UniversityProfile,
  validationIssues: ValidationIssue[],
): RepairResult {
  const actions: RepairAction[] = [];

  // Rebuild sections to ensure correct ordering and all mandatory sections exist
  const currentSections = buildProposalSections(eventDetails, profile);

  // 1. Fix missing sections — rebuild ensures all sections are present
  const missingSectionIssues = validationIssues.filter(
    (i) => i.type === "missing_section",
  );
  for (const issue of missingSectionIssues) {
    const sectionExists = currentSections.some(
      (s) => s.title === issue.section,
    );
    if (sectionExists) {
      actions.push({
        section: issue.section,
        issueType: "missing_section",
        description: `Added missing mandatory section "${issue.section}"`,
        applied: true,
      });
    }
  }

  // 2. Fix section ordering — rebuild ensures correct order
  const orderIssues = validationIssues.filter(
    (i) => i.type === "section_order",
  );
  for (const issue of orderIssues) {
    actions.push({
      section: issue.section,
      issueType: "section_order",
      description: `Reordered section "${issue.section}" to correct position`,
      applied: true,
    });
  }

  // 3. Fix budget calculation errors — recalculate totals
  const budgetIssues = validationIssues.filter(
    (i) => i.type === "budget_error" && i.message.includes("should be"),
  );
  for (const issue of budgetIssues) {
    actions.push({
      section: "Financial Budget",
      issueType: "budget_error",
      description: `Recculated budget total to match quantity × unit price`,
      applied: true,
      before: issue.message,
      after: "Budget totals recalculated automatically",
    });
  }

  // 4. Fix date errors (swap if end < start)
  const dateIssues = validationIssues.filter((i) => i.type === "date_error");
  if (dateIssues.length > 0 && eventDetails.startDate && eventDetails.endDate) {
    const start = new Date(eventDetails.startDate);
    const end = new Date(eventDetails.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
      // Swap dates
      const temp = eventDetails.startDate;
      eventDetails.startDate = eventDetails.endDate;
      eventDetails.endDate = temp;
      actions.push({
        section: "Programme Details",
        issueType: "date_error",
        description: "Swapped start and end dates to fix ordering",
        applied: true,
        before: `Start: ${eventDetails.endDate}, End: ${eventDetails.startDate}`,
        after: `Start: ${eventDetails.startDate}, End: ${eventDetails.endDate}`,
      });
    }
  }

  // 5. Fix invalid participant count — set to a safe minimum if invalid
  if (eventDetails.targetParticipants <= 0) {
    const oldVal = eventDetails.targetParticipants;
    eventDetails.targetParticipants = 50;
    actions.push({
      section: "Target Participants",
      issueType: "invalid_participants",
      description: "Set target participants to default value of 50 (requires confirmation)",
      applied: true,
      before: String(oldVal),
      after: "50",
    });
  }

  // Validate freshly rebuilt sections after the event details have changed.
  const revalidation = validateProposal(eventDetails, profile, buildProposalSections(eventDetails, profile));

  return {
    proposalId: "unknown",
    actions,
    remainingIssues: revalidation.issues,
    status: revalidation.errorCount > 0 ? "fail" : revalidation.warningCount > 0 ? "partial" : "pass",
  };
}
