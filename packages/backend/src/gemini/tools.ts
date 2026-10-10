// ============================================================
// Gemini Tool Definitions — Function declarations for Gemini
// Maps to UniDoc engine functions
// ============================================================

import type { GeminiFunctionDeclaration } from "./client.js";

export const geminiToolDeclarations: GeminiFunctionDeclaration[] = [
  {
    name: "list_universities",
    description: "List all available university template profiles with their IDs, names, and section counts.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_university_rules",
    description: "Get the complete formatting rules, mandatory sections, supporting documents, and approval flow for a specific university.",
    parameters: {
      type: "object",
      properties: {
        universityId: { type: "string", description: "University profile ID (e.g., 'upm', 'um')" },
      },
      required: ["universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "generate_proposal",
    description: "Generate a complete structured event proposal (kertas kerja) from event details and a university template. Creates all mandatory sections with content, tables for budget and programme itinerary, and marks missing info with placeholders.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: {
          type: "object",
          description: "Structured event information including title, organiser, objectives, dates, venue, participants, activities, budget, committee, and expected outcomes.",
        },
        universityId: { type: "string", description: "Target university profile ID" },
      },
      required: ["eventDetails", "universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "validate_proposal",
    description: "Validate a proposal against university template requirements. Checks for missing sections, budget errors, unresolved placeholders, and other compliance issues.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        universityId: { type: "string" },
      },
      required: ["eventDetails", "universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "repair_proposal",
    description: "Automatically repair safe issues in a proposal: fix section ordering, recalculate budget totals, fix date errors, add missing mandatory sections with placeholders.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        universityId: { type: "string" },
        validationIssues: { type: "array", description: "Validation issues from validate_proposal to repair" },
      },
      required: ["eventDetails", "universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "calculate_budget",
    description: "Calculate budget item totals (quantity × unitPrice) and overall expenditure. Detects overruns against a budget limit.",
    parameters: {
      type: "object",
      properties: {
        budgetItems: { type: "array", items: { type: "object" } },
        budgetLimit: { type: "number", description: "Maximum budget in RM (optional)" },
      },
      required: ["budgetItems"],
      additionalProperties: false,
    },
  },
  {
    name: "validate_budget",
    description: "Validate budget items for arithmetic errors, overruns, duplicates, and unrealistic values.",
    parameters: {
      type: "object",
      properties: {
        budgetItems: { type: "array", items: { type: "object" } },
        budgetLimit: { type: "number" },
      },
      required: ["budgetItems"],
      additionalProperties: false,
    },
  },
  {
    name: "export_document",
    description: "Export a proposal as a downloadable document. Supports DOCX (Word) and Markdown formats. Applies university template formatting. Returns the file path.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        universityId: { type: "string" },
        format: { type: "string", enum: ["docx", "markdown"] },
        outputPath: { type: "string", description: "File path for output (optional)" },
      },
      required: ["eventDetails", "universityId", "format"],
      additionalProperties: false,
    },
  },
  {
    name: "get_approval_checklist",
    description: "Get the approval checklist for a university: required approving departments, signatures, supporting documents, and submission stages.",
    parameters: {
      type: "object",
      properties: {
        universityId: { type: "string" },
      },
      required: ["universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_custom_templates",
    description: "List all saved custom document formatting templates.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
];

/**
 * Execute a tool call by dispatching to the appropriate UniDoc engine function.
 */
export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: unknown; error?: string }> {
  try {
    // Dynamic import to avoid loading MCP server entry
    const services = await import("@unidoc/mcp-server/services");

    switch (name) {
      case "list_universities": {
        const universities = services.listUniversities();
        const summaries = universities.map((u) => services.getUniversitySummary(u.id)!);
        return { result: { success: true, count: summaries.length, universities: summaries } };
      }

      case "get_university_rules": {
        const { universityId } = args as { universityId: string };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        return { result: { success: true, university: profile } };
      }

      case "generate_proposal": {
        const { eventDetails, universityId } = args as { eventDetails: any; universityId: string };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        const sections = services.buildProposalSections(eventDetails, profile);
        return {
          result: {
            success: true,
            proposal: {
              id: `proposal-${Date.now()}`,
              eventDetails,
              universityProfileId: universityId,
              sections,
              status: "draft",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            message: `Generated ${sections.length} sections.`,
          },
        };
      }

      case "validate_proposal": {
        const { eventDetails, universityId } = args as { eventDetails: any; universityId: string };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        const sections = services.buildProposalSections(eventDetails, profile);
        const report = services.validateProposal(eventDetails, profile, sections);
        report.proposalId = `proposal-${Date.now()}`;
        return { result: { success: true, report } };
      }

      case "repair_proposal": {
        const { eventDetails, universityId, validationIssues } = args as {
          eventDetails: any; universityId: string; validationIssues: any[];
        };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        const result = services.repairProposal(eventDetails, profile, validationIssues || []);
        result.proposalId = `proposal-${Date.now()}`;
        const sections = services.buildProposalSections(eventDetails, profile);
        return { result: { success: true, result, repairedSections: sections } };
      }

      case "calculate_budget": {
        const { budgetItems, budgetLimit } = args as { budgetItems: any[]; budgetLimit?: number };
        const summary = services.calculateBudget(budgetItems, budgetLimit);
        return { result: { success: true, summary } };
      }

      case "validate_budget": {
        const { budgetItems, budgetLimit } = args as { budgetItems: any[]; budgetLimit?: number };
        const result = services.validateBudget(budgetItems, budgetLimit);
        return { result: { success: true, result } };
      }

      case "export_document": {
        const { eventDetails, universityId, format, outputPath } = args as {
          eventDetails: any; universityId: string; format: "docx" | "markdown"; outputPath?: string;
        };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        const sections = services.buildProposalSections(eventDetails, profile);

        if (format === "markdown") {
          const content = services.generateMarkdown(sections, profile, eventDetails);
          const path = outputPath || `output/${universityId}-${Date.now()}.md`;
          const { writeFileSync, mkdirSync } = await import("node:fs");
          const { dirname } = await import("node:path");
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, content, "utf-8");
          return { result: { success: true, format: "markdown", filePath: path, content } };
        }

        // DOCX
        const path = outputPath || `output/${universityId}-${Date.now()}.docx`;
        const { mkdirSync } = await import("node:fs");
        const { dirname } = await import("node:path");
        mkdirSync(dirname(path), { recursive: true });
        await services.generateDocx(sections, profile, eventDetails, path);
        return { result: { success: true, format: "docx", filePath: path } };
      }

      case "get_approval_checklist": {
        const { universityId } = args as { universityId: string };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        return {
          result: {
            success: true,
            checklist: profile.approvalFlow,
            supportingDocuments: profile.supportingDocuments,
            isVerified: profile.isVerified,
          },
        };
      }

      case "list_custom_templates": {
        const templates = services.listCustomTemplates();
        return { result: { success: true, count: templates.length, templates } };
      }

      default:
        return { result: { success: false, error: `Unknown tool: ${name}` } };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { result: { success: false, error: message }, error: message };
  }
}
