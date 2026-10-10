// ============================================================
// Validator — Validates proposals against university rules
// ============================================================

import type {
  EventDetails,
  UniversityProfile,
  ValidationIssue,
  ValidationReport,
  ProposalSection,
} from "@unidoc/shared";
import { validateBudget } from "./budget-engine.js";

/**
 * Validate a proposal against university template requirements.
 * Checks: mandatory sections, section ordering, budget, placeholders, committee, activities.
 */
export function validateProposal(
  eventDetails: EventDetails,
  profile: UniversityProfile,
  sections?: ProposalSection[],
): ValidationReport {
  const issues: ValidationIssue[] = [];

  // 1. Check mandatory sections are present
  const mandatorySections = profile.sections.filter((s) => s.mandatory);
  const presentSectionIds = new Set(sections?.map((s) => s.sectionId) || []);

  for (const section of mandatorySections) {
    if (!presentSectionIds.has(section.id)) {
      issues.push({
        section: section.name,
        severity: "error",
        type: "missing_section",
        message: `Mandatory section "${section.name}" is missing`,
        suggestion: `Add the "${section.name}" section to the proposal`,
      });
    }
  }

  // 2. Check section ordering (if sections provided)
  if (sections && sections.length > 0) {
    let expectedOrder = 0;
    for (let i = 0; i < sections.length; i++) {
      const sectionDef = profile.sections.find((s) => s.id === sections[i].sectionId);
      if (sectionDef && sectionDef.order < expectedOrder) {
        issues.push({
          section: sections[i].title,
          severity: "warning",
          type: "section_order",
          message: `Section "${sections[i].title}" appears out of order`,
          suggestion: `Move this section to position ${sectionDef.order + 1}`,
        });
      }
      if (sectionDef) {
        expectedOrder = Math.max(expectedOrder, sectionDef.order);
      }
    }
  }

  // 3. Check budget
  if (eventDetails.budget.length > 0) {
    const budgetResult = validateBudget(eventDetails.budget, eventDetails.budgetLimit);
    for (const issue of budgetResult.issues) {
      issues.push({
        section: "Financial Budget",
        severity: issue.severity,
        type: "budget_error",
        message: issue.message,
        suggestion: issue.suggestion || "Review budget items",
      });
    }
  } else {
    issues.push({
      section: "Financial Budget",
      severity: "error",
      type: "missing_budget",
      message: "No budget items provided",
      suggestion: "Add at least one budget item with category, description, quantity, and unit price",
    });
  }

  // 4. Check for unresolved placeholders in section content
  if (sections) {
    for (const section of sections) {
      const placeholderMatch = section.content.match(/\[PLACEHOLDER:[^\]]+\]/g);
      if (placeholderMatch) {
        for (const match of placeholderMatch) {
          issues.push({
            section: section.title,
            severity: "warning",
            type: "unresolved_placeholder",
            message: `Unresolved placeholder in "${section.title}": ${match}`,
            suggestion: "Fill in the placeholder with actual content or confirm it will be addressed later",
          });
        }
      }
    }
  }

  // 5. Check committee — need at least key positions
  const keyPositions = ["pengerusi", "chairman", "setiausaha", "secretary", "bendahari", "treasurer"];
  const hasKeyPositions = eventDetails.committee.some((m) =>
    keyPositions.some((pos) => m.position.toLowerCase().includes(pos)),
  );
  if (eventDetails.committee.length === 0) {
    issues.push({
      section: "Organising Committee",
      severity: "error",
      type: "missing_committee",
      message: "No organising committee members provided",
      suggestion: "Add at least the Chairman, Secretary, and Treasurer",
    });
  } else if (!hasKeyPositions) {
    issues.push({
      section: "Organising Committee",
      severity: "warning",
      type: "incomplete_committee",
      message: "Key committee positions (Chairman, Secretary, Treasurer) not found",
      suggestion: "Ensure key positions are filled",
    });
  }

  // 6. Check activities
  if (eventDetails.activities.length === 0) {
    issues.push({
      section: "Tentative Programme",
      severity: "error",
      type: "missing_activities",
      message: "No programme activities provided",
      suggestion: "Add a tentative programme with time slots and activities",
    });
  }

  // 7. Check objectives
  if (eventDetails.objectives.length === 0) {
    issues.push({
      section: "Objectives",
      severity: "error",
      type: "missing_objectives",
      message: "No programme objectives provided",
      suggestion: "Add at least 3 programme objectives",
    });
  } else if (eventDetails.objectives.length < 3) {
    issues.push({
      section: "Objectives",
      severity: "warning",
      type: "insufficient_objectives",
      message: `Only ${eventDetails.objectives.length} objectives provided (recommended: at least 3)`,
      suggestion: "Consider adding more objectives",
    });
  }

  // 8. Check expected outcomes
  if (eventDetails.expectedOutcomes.length === 0) {
    issues.push({
      section: "Expected Outcomes",
      severity: "error",
      type: "missing_outcomes",
      message: "No expected outcomes provided",
      suggestion: "Add at least 3 expected outcomes",
    });
  }

  // 9. Check dates
  if (eventDetails.startDate && eventDetails.endDate) {
    const start = new Date(eventDetails.startDate);
    const end = new Date(eventDetails.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
      issues.push({
        section: "Programme Details",
        severity: "error",
        type: "date_error",
        message: "End date is before start date",
        suggestion: "Correct the end date to be on or after the start date",
      });
    }
  }

  // 10. Check target participants
  if (eventDetails.targetParticipants <= 0) {
    issues.push({
      section: "Target Participants",
      severity: "error",
      type: "invalid_participants",
      message: "Target participant count must be positive",
      suggestion: "Provide a valid number of target participants",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const status = errorCount > 0 ? "fail" : (warningCount > 0 ? "warning" : "pass");

  return {
    proposalId: "unknown", // Set by caller
    status,
    issues,
    totalIssues: issues.length,
    errorCount,
    warningCount,
  };
}
