// ============================================================
// Tool Definitions — All MCP tools with schemas and handlers
// ============================================================

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { EventDetails } from "@unidoc/shared";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  listUniversities,
  getUniversity,
  getUniversitySummary,
} from "./engine/university-store.js";
import {
  calculateBudget,
  validateBudget,
  suggestBudgetAdjustments,
} from "./engine/budget-engine.js";
import { buildProposalSections } from "./engine/proposal-builder.js";
import { validateProposal } from "./engine/validator.js";
import { repairProposal } from "./engine/repair-engine.js";
import { generateMarkdown } from "./engine/markdown-generator.js";
import { generateDocx } from "./engine/docx-generator.js";
import {
  createCustomTemplate,
  listCustomTemplates,
  getCustomTemplate,
} from "./engine/custom-template-store.js";

// ─── Helper: create text response ────────────────────────────

type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function textResult(data: unknown): ToolResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(message: string): ToolResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: false, error: message }),
      },
    ],
    isError: true,
  };
}

// ─── Tool Definitions ────────────────────────────────────────

const tools: Tool[] = [
  // ─── University Tools ──────────────────────────────────
  {
    name: "list_universities",
    description:
      "List all available university template profiles. Returns each university's id, name, full name, verification status, and section count. Use get_university_rules to retrieve full formatting details for a specific university.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_university_rules",
    description:
      "Get the complete formatting rules and section requirements for a specific university. Returns the full university profile including formatting (fonts, margins, spacing), mandatory sections, supporting documents, and approval flow.",
    inputSchema: {
      type: "object",
      properties: {
        universityId: {
          type: "string",
          description: "University profile ID (e.g., 'upm', 'um')",
        },
      },
      required: ["universityId"],
      additionalProperties: false,
    },
  },

  // ─── Proposal Tools ────────────────────────────────────
  {
    name: "generate_proposal",
    description:
      "Generate a complete structured event proposal (kertas kerja) from event details and a university template. Creates all mandatory sections with appropriate content, tables for budget and tentative programme, and marks missing information with [PLACEHOLDER] tags. Use after extract_event_details or when the user provides structured event information.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: {
          type: "object",
          description: "Structured event information",
          properties: {
            title: { type: "string" },
            university: { type: "string" },
            organiser: { type: "string" },
            objectives: { type: "array", items: { type: "string" } },
            startDate: { type: "string", description: "ISO date" },
            endDate: { type: "string", description: "ISO date" },
            venue: { type: "string" },
            targetParticipants: { type: "number" },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string" },
                  description: { type: "string" },
                  facilitator: { type: "string" },
                },
                required: ["time", "description"],
              },
            },
            budget: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unitPrice: { type: "number" },
                },
                required: ["category", "description", "quantity", "unitPrice"],
              },
            },
            budgetLimit: { type: "number" },
            committee: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  position: { type: "string" },
                  name: { type: "string" },
                  studentId: { type: "string" },
                  faculty: { type: "string" },
                },
                required: ["position", "name"],
              },
            },
            expectedOutcomes: { type: "array", items: { type: "string" } },
            background: { type: "string" },
            introduction: { type: "string" },
            conclusion: { type: "string" },
          },
          required: [
            "title", "university", "organiser", "objectives",
            "startDate", "endDate", "venue", "targetParticipants",
            "activities", "budget", "committee", "expectedOutcomes",
          ],
        },
        universityId: { type: "string", description: "Target university profile ID" },
        customTemplateId: { type: "string", description: "Optional custom template ID to apply instead of university template" },
      },
      required: ["eventDetails", "universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "validate_proposal",
    description:
      "Validate a generated proposal against university template requirements. Checks for missing mandatory sections, incorrect section ordering, budget calculation errors, unresolved placeholders, missing committee members, and other compliance issues. Returns a detailed validation report with issue severity, messages, and suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information (same schema as generate_proposal)" },
        universityId: { type: "string" },
      },
      required: ["eventDetails", "universityId"],
      additionalProperties: false,
    },
  },
  {
    name: "repair_proposal",
    description:
      "Automatically repair safe and correctable issues in a proposal. Fixes: missing sections, incorrect section ordering, budget calculation errors, date ordering errors, and invalid participant counts. Substantive information is never fabricated — missing content gets [PLACEHOLDER] tags. Returns a repair summary with actions applied and remaining issues.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        universityId: { type: "string" },
        validationIssues: {
          type: "array",
          description: "Validation issues from validate_proposal to repair",
          items: {
            type: "object",
            properties: {
              section: { type: "string" },
              severity: { type: "string", enum: ["error", "warning", "info"] },
              type: { type: "string" },
              message: { type: "string" },
              suggestion: { type: "string" },
            },
          },
        },
      },
      required: ["eventDetails", "universityId"],
      additionalProperties: false,
    },
  },

  // ─── Budget Tools ──────────────────────────────────────
  {
    name: "calculate_budget",
    description:
      "Calculate budget item totals and overall expenditure. Computes quantity × unitPrice for each item, sums total expenditure, and compares against an optional budget limit to detect overruns or remaining budget.",
    inputSchema: {
      type: "object",
      properties: {
        budgetItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number", description: "Price per unit in RM" },
            },
            required: ["category", "description", "quantity", "unitPrice"],
          },
        },
        budgetLimit: { type: "number", description: "Maximum budget in RM (optional)" },
      },
      required: ["budgetItems"],
      additionalProperties: false,
    },
  },
  {
    name: "validate_budget",
    description:
      "Validate budget items for arithmetic errors, overruns, duplicates, and unrealistic values. Returns issues with severity levels (error/warning/info) and suggestions for correction.",
    inputSchema: {
      type: "object",
      properties: {
        budgetItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              total: { type: "number", description: "Optional: if provided, checked for arithmetic errors" },
            },
            required: ["category", "description", "quantity", "unitPrice"],
          },
        },
        budgetLimit: { type: "number" },
      },
      required: ["budgetItems"],
      additionalProperties: false,
    },
  },
  {
    name: "suggest_budget_adjustments",
    description:
      "Suggest ways to reduce expenditure to fit within a budget limit. Prioritises reducing high-cost items and finding cheaper alternatives. Use when a budget overrun is detected.",
    inputSchema: {
      type: "object",
      properties: {
        budgetItems: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              total: { type: "number" },
            },
            required: ["category", "description", "quantity", "unitPrice", "total"],
          },
        },
        budgetLimit: { type: "number" },
      },
      required: ["budgetItems", "budgetLimit"],
      additionalProperties: false,
    },
  },

  // ─── Export Tools ─────────────────────────────────────
  {
    name: "export_document",
    description:
      "Export a generated proposal as a downloadable document. Supports DOCX (Word) and Markdown formats. Applies university template formatting (fonts, margins, spacing) to the output. Returns the file path of the exported document.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        universityId: { type: "string" },
        format: { type: "string", enum: ["docx", "markdown", "pdf"], default: "docx" },
        outputPath: { type: "string", description: "File path for the output document (optional)" },
      },
      required: ["eventDetails", "universityId", "format"],
      additionalProperties: false,
    },
  },

  // ─── Approval Tools ───────────────────────────────────
  {
    name: "get_approval_checklist",
    description:
      "Get an approval checklist for a specific university. Lists required approving departments, signatures, supporting documents, and submission stages. Marked as verified or unverified — only verified requirements are authoritative.",
    inputSchema: {
      type: "object",
      properties: {
        universityId: { type: "string" },
      },
      required: ["universityId"],
      additionalProperties: false,
    },
  },

  // ─── Custom Formatter Tools ────────────────────────────
  {
    name: "create_custom_template",
    description:
      "Create a custom document formatting template. Define fonts, margins, spacing, and section structure. Saved templates can be reused for multiple proposals.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        formatting: {
          type: "object",
          properties: {
            fontFamily: { type: "string" },
            bodyFontSize: { type: "number" },
            headingFontSize: { type: "number" },
            subHeadingFontSize: { type: "number" },
            lineSpacing: { type: "number" },
            paragraphSpacingBefore: { type: "number" },
            paragraphSpacingAfter: { type: "number" },
            margins: {
              type: "object",
              properties: {
                top: { type: "number" },
                right: { type: "number" },
                bottom: { type: "number" },
                left: { type: "number" },
              },
              required: ["top", "right", "bottom", "left"],
            },
            pageSize: { type: "string", enum: ["A4", "Letter"] },
            orientation: { type: "string", enum: ["portrait", "landscape"] },
          },
          required: ["fontFamily", "bodyFontSize", "headingFontSize", "subHeadingFontSize", "lineSpacing", "paragraphSpacingBefore", "paragraphSpacingAfter", "margins", "pageSize", "orientation"],
        },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              mandatory: { type: "boolean" },
              order: { type: "number" },
              hasTable: { type: "boolean" },
              description: { type: "string" },
            },
            required: ["id", "name", "mandatory", "order"],
          },
        },
      },
      required: ["name", "formatting", "sections"],
      additionalProperties: false,
    },
  },
  {
    name: "list_custom_templates",
    description:
      "List all saved custom document formatting templates. Returns each template's id, name, description, section count, and creation date.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "apply_custom_formatter",
    description:
      "Generate a proposal using a custom formatting template instead of a university template. Produces the same structured proposal but applies the custom template's formatting rules.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        customTemplateId: { type: "string" },
      },
      required: ["eventDetails", "customTemplateId"],
      additionalProperties: false,
    },
  },
  {
    name: "validate_custom_format",
    description:
      "Validate a proposal against a custom formatting template. Checks section ordering, mandatory sections, and formatting consistency.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information" },
        customTemplateId: { type: "string" },
      },
      required: ["eventDetails", "customTemplateId"],
      additionalProperties: false,
    },
  },

  // ─── Conversion Tools ──────────────────────────────────
  {
    name: "convert_university_format",
    description:
      "Convert a proposal from one university format to another. Extracts content from the original proposal and reorganises it according to the destination university's template. Preserves original meaning and marks any additional required sections with [PLACEHOLDER] tags.",
    inputSchema: {
      type: "object",
      properties: {
        eventDetails: { type: "object", description: "Structured event information (from original university)" },
        fromUniversityId: { type: "string" },
        toUniversityId: { type: "string" },
      },
      required: ["eventDetails", "fromUniversityId", "toUniversityId"],
      additionalProperties: false,
    },
  },
];

export { tools };

// ─── Tool Handler ───────────────────────────────────────────

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResponse> {
  try {
    switch (name) {
      // ─── University Tools ────────────────────────────────
      case "list_universities": {
        const universities = listUniversities();
        const summaries = universities.map((u) => getUniversitySummary(u.id)!);
        return textResult({
          success: true,
          count: summaries.length,
          universities: summaries,
        });
      }

      case "get_university_rules": {
        const { universityId } = args as { universityId: string };
        const profile = getUniversity(universityId);
        if (!profile) {
          return errorResult(`University profile "${universityId}" not found. Use list_universities to see available profiles.`);
        }
        return textResult({
          success: true,
          university: profile,
        });
      }

      // ─── Proposal Tools ──────────────────────────────────
      case "generate_proposal": {
        const { eventDetails, universityId, customTemplateId } = args as {
          eventDetails: EventDetails;
          universityId: string;
          customTemplateId?: string;
        };

        // Use custom template if provided, otherwise university template
        let profile;
        if (customTemplateId) {
          const template = getCustomTemplate(customTemplateId);
          if (!template) {
            return errorResult(`Custom template "${customTemplateId}" not found.`);
          }
          profile = {
            ...template,
            id: universityId,
            name: template.name,
            fullName: template.name,
            isVerified: false,
            supportingDocuments: [],
            approvalFlow: [],
          };
        } else {
          profile = getUniversity(universityId);
          if (!profile) {
            return errorResult(`University profile "${universityId}" not found.`);
          }
        }

        const sections = buildProposalSections(eventDetails, profile);
        const proposal = {
          id: `proposal-${Date.now()}`,
          eventDetails,
          universityProfileId: universityId,
          sections,
          status: "draft" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return textResult({
          success: true,
          proposal,
          message: `Proposal generated with ${sections.length} sections using ${profile.fullName} template.`,
        });
      }

      case "validate_proposal": {
        const { eventDetails, universityId } = args as {
          eventDetails: EventDetails;
          universityId: string;
        };

        const profile = getUniversity(universityId);
        if (!profile) {
          return errorResult(`University profile "${universityId}" not found.`);
        }

        const sections = buildProposalSections(eventDetails, profile);
        const report = validateProposal(eventDetails, profile, sections);
        report.proposalId = `proposal-${Date.now()}`;

        return textResult({
          success: true,
          report,
        });
      }

      case "repair_proposal": {
        const { eventDetails, universityId, validationIssues } = args as {
          eventDetails: EventDetails;
          universityId: string;
          validationIssues?: Array<{
            section: string;
            severity: "error" | "warning" | "info";
            type: string;
            message: string;
            suggestion: string;
          }>;
        };

        const profile = getUniversity(universityId);
        if (!profile) {
          return errorResult(`University profile "${universityId}" not found.`);
        }

        const issues = validationIssues || [];
        const result = repairProposal(eventDetails, profile, issues);
        result.proposalId = `proposal-${Date.now()}`;

        // Rebuild sections with repaired event details
        const sections = buildProposalSections(eventDetails, profile);

        return textResult({
          success: true,
          result,
          repairedSections: sections,
        });
      }

      // ─── Budget Tools ────────────────────────────────────
      case "calculate_budget": {
        const { budgetItems, budgetLimit } = args as {
          budgetItems: Array<{ category: string; description: string; quantity: number; unitPrice: number }>;
          budgetLimit?: number;
        };

        const summary = calculateBudget(budgetItems, budgetLimit);
        return textResult({ success: true, summary });
      }

      case "validate_budget": {
        const { budgetItems, budgetLimit } = args as {
          budgetItems: Array<{ category: string; description: string; quantity: number; unitPrice: number; total?: number }>;
          budgetLimit?: number;
        };

        const result = validateBudget(budgetItems, budgetLimit);
        return textResult({ success: true, result });
      }

      case "suggest_budget_adjustments": {
        const { budgetItems, budgetLimit } = args as {
          budgetItems: Array<{ category: string; description: string; quantity: number; unitPrice: number; total: number }>;
          budgetLimit: number;
        };

        // Calculate totals if not provided
        const itemsWithTotals = budgetItems.map((item) => ({
          ...item,
          total: item.total || item.quantity * item.unitPrice,
        }));

        const result = suggestBudgetAdjustments(itemsWithTotals, budgetLimit);
        return textResult({ success: true, ...result });
      }

      // ─── Export Tools ───────────────────────────────────
      case "export_document": {
        const { eventDetails, universityId, format, outputPath } = args as {
          eventDetails: EventDetails;
          universityId: string;
          format: "docx" | "markdown" | "pdf";
          outputPath?: string;
        };

        const profile = getUniversity(universityId);
        if (!profile) {
          return errorResult(`University profile "${universityId}" not found.`);
        }

        const sections = buildProposalSections(eventDetails, profile);

        if (format === "markdown") {
          const content = generateMarkdown(sections, profile, eventDetails);
          const path = outputPath || `output/${universityId}-${eventDetails.title.replace(/\s+/g, "-").toLowerCase()}.md`;
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, content, "utf-8");

          return textResult({
            success: true,
            format: "markdown",
            filePath: path,
            message: `Markdown document exported to ${path}`,
          });
        }

        if (format === "docx") {
          const path = outputPath || `output/${universityId}-${eventDetails.title.replace(/\s+/g, "-").toLowerCase()}.docx`;
          await generateDocx(sections, profile, eventDetails, path);

          return textResult({
            success: true,
            format: "docx",
            filePath: path,
            message: `DOCX document exported to ${path}`,
          });
        }

        return errorResult(`PDF export not yet supported in MVP. Use 'docx' or 'markdown' format.`);
      }

      // ─── Approval Tools ─────────────────────────────────
      case "get_approval_checklist": {
        const { universityId } = args as { universityId: string };
        const profile = getUniversity(universityId);
        if (!profile) {
          return errorResult(`University profile "${universityId}" not found.`);
        }

        const checklist = profile.approvalFlow.map((stage) => ({
          stage: stage.stage,
          approver: stage.approver,
          role: stage.role,
          status: "pending" as const,
          verified: stage.verified,
          notes: stage.notes || "",
        }));

        return textResult({
          success: true,
          universityId,
          universityName: profile.fullName,
          isVerified: profile.isVerified,
          checklist,
          supportingDocuments: profile.supportingDocuments,
          message: profile.isVerified
            ? "Approval requirements are from verified university guidelines."
            : "Approval requirements are from a demonstration template. Verify against official university guidelines.",
        });
      }

      // ─── Custom Formatter Tools ─────────────────────────
      case "create_custom_template": {
        const { name, description, formatting, sections } = args as {
          name: string;
          description?: string;
          formatting: import("@unidoc/shared").UniversityFormatting;
          sections: import("@unidoc/shared").SectionDefinition[];
        };

        const template = createCustomTemplate({ name, description, formatting, sections });
        return textResult({ success: true, template });
      }

      case "list_custom_templates": {
        const templates = listCustomTemplates();
        return textResult({
          success: true,
          count: templates.length,
          templates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            sectionCount: t.sections.length,
            createdAt: t.createdAt,
          })),
        });
      }

      case "apply_custom_formatter": {
        const { eventDetails, customTemplateId } = args as {
          eventDetails: EventDetails;
          customTemplateId: string;
        };

        const template = getCustomTemplate(customTemplateId);
        if (!template) {
          return errorResult(`Custom template "${customTemplateId}" not found.`);
        }

        const profile = {
          ...template,
          id: "custom",
          name: template.name,
          fullName: template.name,
          isVerified: false,
          supportingDocuments: [],
          approvalFlow: [],
        };

        const sections = buildProposalSections(eventDetails, profile);
        return textResult({
          success: true,
          proposal: {
            id: `proposal-${Date.now()}`,
            eventDetails,
            universityProfileId: `custom:${customTemplateId}`,
            sections,
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          message: `Proposal generated using custom template "${template.name}".`,
        });
      }

      case "validate_custom_format": {
        const { eventDetails, customTemplateId } = args as {
          eventDetails: EventDetails;
          customTemplateId: string;
        };

        const template = getCustomTemplate(customTemplateId);
        if (!template) {
          return errorResult(`Custom template "${customTemplateId}" not found.`);
        }

        const profile = {
          ...template,
          id: "custom",
          name: template.name,
          fullName: template.name,
          isVerified: false,
          supportingDocuments: [],
          approvalFlow: [],
        };

        const sections = buildProposalSections(eventDetails, profile);
        const report = validateProposal(eventDetails, profile, sections);

        return textResult({ success: true, report });
      }

      // ─── Conversion Tools ────────────────────────────────
      case "convert_university_format": {
        const { eventDetails, fromUniversityId, toUniversityId } = args as {
          eventDetails: EventDetails;
          fromUniversityId: string;
          toUniversityId: string;
        };

        const toProfile = getUniversity(toUniversityId);
        if (!toProfile) {
          return errorResult(`Destination university profile "${toUniversityId}" not found.`);
        }

        const fromProfile = getUniversity(fromUniversityId);

        // Rebuild sections with destination template
        const sections = buildProposalSections(eventDetails, toProfile);

        // Identify sections in destination that are new (not in source)
        const sourceSectionIds = new Set(fromProfile?.sections.map((s) => s.id) || []);
        const newSections = toProfile.sections.filter(
          (s) => !sourceSectionIds.has(s.id),
        );

        return textResult({
          success: true,
          convertedProposal: {
            id: `proposal-${Date.now()}`,
            eventDetails: { ...eventDetails, university: toUniversityId },
            universityProfileId: toUniversityId,
            sections,
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          newSections: newSections.map((s) => ({
            sectionId: s.id,
            name: s.name,
            mandatory: s.mandatory,
            note: "This section exists in the destination template but not in the original. Review and fill in content.",
          })),
          message: `Converted from ${fromProfile?.name || fromUniversityId} to ${toProfile.fullName} format. ${newSections.length} new section(s) require attention.`,
        });
      }

      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(`Tool execution error: ${message}`);
  }
}

// ─── Register tools on MCP server ────────────────────────────

export function registerTools(server: Server): void {
  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, (args || {}) as Record<string, unknown>);
  });
}
