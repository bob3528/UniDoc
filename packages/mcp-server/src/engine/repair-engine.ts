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
  const resolvedIssueTypes = new Set<string>();

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
      resolvedIssueTypes.add(`missing_section:${issue.section}`);
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
    resolvedIssueTypes.add(`section_order:${issue.section}`);
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
    resolvedIssueTypes.add(`budget_error:${issue.section}`);
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
      resolvedIssueTypes.add("date_error:Programme Details");
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
    resolvedIssueTypes.add("invalid_participants:Target Participants");
  }

  // Determine remaining issues
  const remainingIssues = validationIssues.filter((issue) => {
    const key = `${issue.type}:${issue.section}`;
    return !resolvedIssueTypes.has(key);
  });

  // Re-validate to get updated status
  const revalidation = validateProposal(eventDetails, profile, currentSections);

  const status: RepairResult["status"] =
    revalidation.errorCount === 0
      ? revalidation.warningCount === 0
        ? "pass"
        : "partial"
      : remainingIssues.some((i) => i.severity === "error")
        ? "fail"
        : "partial";

  return {
    proposalId: "unknown",
    actions,
    remainingIssues,
    status,
  };
}
