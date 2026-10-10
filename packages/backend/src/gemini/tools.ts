// ============================================================
// Gemini Tool Definitions — Function declarations for Gemini
// Maps to UniDoc engine functions
// ============================================================

import type { GeminiFunctionDeclaration } from "./client.js";
import { eventDetailsSchema, generateProposalInputSchema,
  validateProposalInputSchema, repairProposalInputSchema, calculateBudgetInputSchema, validateBudgetInputSchema,
  getUniversityRulesInputSchema } from "@unidoc/shared";
import { z } from "zod";
import { exportDocument } from "../export.js";

const string = { type: "string" };
const budgetItem = { type: "object", properties: {
  category: string, description: string, quantity: { type: "number" }, unitPrice: { type: "number" },
}, required: ["category", "description", "quantity", "unitPrice"] };
const eventParameters = { type: "object", properties: {
  title: string, university: string, organiser: string,
  objectives: { type: "array", items: string }, startDate: string, endDate: string, venue: string,
  targetParticipants: { type: "integer" },
  activities: { type: "array", items: { type: "object", properties: {
    time: string, description: string, facilitator: string,
  }, required: ["time", "description"] } },
  budget: { type: "array", items: budgetItem }, budgetLimit: { type: "number" },
  committee: { type: "array", items: { type: "object", properties: {
    position: string, name: string, studentId: string, faculty: string,
  }, required: ["position", "name"] } },
  expectedOutcomes: { type: "array", items: string }, background: string, introduction: string, conclusion: string,
}, required: Object.keys(eventDetailsSchema.shape).filter(key => !["budgetLimit", "background", "introduction", "conclusion"].includes(key)) };
const issueParameters = { type: "object", properties: {
  section: string, severity: { type: "string", enum: ["error", "warning", "info"] },
  type: string, message: string, suggestion: string,
}, required: ["section", "severity", "type", "message", "suggestion"] };
const toolSchemas: Record<string, z.ZodTypeAny> = {
  list_universities: z.object({}).strict(), get_university_rules: getUniversityRulesInputSchema,
  generate_proposal: generateProposalInputSchema.omit({ customTemplateId: true }),
  validate_proposal: validateProposalInputSchema, repair_proposal: repairProposalInputSchema,
  calculate_budget: calculateBudgetInputSchema, validate_budget: validateBudgetInputSchema,
  export_document: z.object({ eventDetails: eventDetailsSchema, universityId: z.string().min(1),
    format: z.enum(["docx", "markdown"]) }).strict(),
  get_approval_checklist: getUniversityRulesInputSchema,
  list_custom_templates: z.object({}).strict(),
};

export const geminiToolDeclarations: GeminiFunctionDeclaration[] = [
  {
    name: "list_universities",
    description: "List all available university template profiles with their IDs, names, and section counts.",
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
    },
  },
  {
    name: "generate_proposal",
    description: "Generate a complete structured event proposal (kertas kerja) from event details and a university template. Creates all mandatory sections with content, tables for budget and programme itinerary, and marks missing info with placeholders.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: eventParameters,
        universityId: { type: "string", description: "Target university profile ID" },
      },
      required: ["eventDetails", "universityId"],
    },
  },
  {
    name: "validate_proposal",
    description: "Validate a proposal against university template requirements. Checks for missing sections, budget errors, unresolved placeholders, and other compliance issues.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: eventParameters,
        universityId: { type: "string" },
      },
      required: ["eventDetails", "universityId"],
    },
  },
  {
    name: "repair_proposal",
    description: "Automatically repair safe issues in a proposal: fix section ordering, recalculate budget totals, fix date errors, add missing mandatory sections with placeholders.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: eventParameters,
        universityId: { type: "string" },
        validationIssues: { type: "array", items: issueParameters },
      },
      required: ["eventDetails", "universityId"],
    },
  },
  {
    name: "calculate_budget",
    description: "Calculate budget item totals (quantity × unitPrice) and overall expenditure. Detects overruns against a budget limit.",
    parameters: {
      type: "object",
      properties: {
        budgetItems: { type: "array", items: budgetItem },
        budgetLimit: { type: "number", description: "Maximum budget in RM (optional)" },
      },
      required: ["budgetItems"],
    },
  },
  {
    name: "validate_budget",
    description: "Validate budget items for arithmetic errors, overruns, duplicates, and unrealistic values.",
    parameters: {
      type: "object",
      properties: {
        budgetItems: { type: "array", items: budgetItem },
        budgetLimit: { type: "number" },
      },
      required: ["budgetItems"],
    },
  },
  {
    name: "export_document",
    description: "Export a proposal as a downloadable document. Supports DOCX (Word) and Markdown formats. Applies university template formatting. Returns the file path.",
    parameters: {
      type: "object",
      properties: {
        eventDetails: eventParameters,
        universityId: { type: "string" },
        format: { type: "string", enum: ["docx", "markdown"] },
      },
      required: ["eventDetails", "universityId", "format"],
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
    },
  },
  {
    name: "list_custom_templates",
    description: "List all saved custom document formatting templates.",
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
    const schema = toolSchemas[name];
    if (!schema) return { result: { success: false, error: `Unknown tool: ${name}` } };
    args = schema.parse(args);
    if (args.eventDetails && (args.eventDetails as { university: string }).university !== args.universityId) {
      throw new Error("eventDetails.university must match universityId");
    }
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
        return { result: { success: true, result, eventDetails, repairedSections: sections } };
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
        const { eventDetails, universityId, format } = args as {
          eventDetails: any; universityId: string; format: "docx" | "markdown";
        };
        const profile = services.getUniversity(universityId);
        if (!profile) return { result: { success: false, error: `University "${universityId}" not found` } };
        return { result: await exportDocument(eventDetails, profile, format) };
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
