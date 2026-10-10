// ============================================================
// UniDoc Shared Zod Schemas — Input validation for MCP tools
// ============================================================

import { z } from "zod";

// ─── University Schemas ──────────────────────────────────────

export const universityFormattingSchema = z.object({
  fontFamily: z.string().min(1),
  bodyFontSize: z.number().positive(),
  headingFontSize: z.number().positive(),
  subHeadingFontSize: z.number().positive(),
  lineSpacing: z.number().positive(),
  paragraphSpacingBefore: z.number().nonnegative(),
  paragraphSpacingAfter: z.number().nonnegative(),
  margins: z.object({
    top: z.number().positive(),
    right: z.number().positive(),
    bottom: z.number().positive(),
    left: z.number().positive(),
  }),
  pageSize: z.enum(["A4", "Letter"]),
  orientation: z.enum(["portrait", "landscape"]),
});

export const sectionDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mandatory: z.boolean(),
  order: z.number().int().nonnegative(),
  hasTable: z.boolean().optional(),
  description: z.string().optional(),
});

// ─── Budget Schemas ──────────────────────────────────────────

export const budgetItemSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const budgetItemInputSchema = z.object({
  category: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

// ─── Event Details Schemas ──────────────────────────────────

export const activitySchema = z.object({
  time: z.string().min(1),
  description: z.string().min(1),
  facilitator: z.string().optional(),
});

export const committeeMemberSchema = z.object({
  position: z.string().min(1),
  name: z.string().min(1),
  studentId: z.string().optional(),
  faculty: z.string().optional(),
});

const calendarDateSchema = z.string().refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Use a valid YYYY-MM-DD date");

export const eventDetailsSchema = z.object({
  title: z.string().min(1),
  university: z.string().min(1),
  organiser: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  venue: z.string().min(1),
  targetParticipants: z.number().int().positive(),
  activities: z.array(activitySchema),
  budget: z.array(budgetItemInputSchema),
  budgetLimit: z.number().positive().optional(),
  committee: z.array(committeeMemberSchema),
  expectedOutcomes: z.array(z.string().min(1)).min(1),
  background: z.string().optional(),
  introduction: z.string().optional(),
  conclusion: z.string().optional(),
});

// ─── Tool Input Schemas ─────────────────────────────────────

export const listUniversitiesInputSchema = z.object({}).strict();

export const getUniversityRulesInputSchema = z.object({
  universityId: z.string().min(1),
}).strict();

export const extractEventDetailsInputSchema = z.object({
  prompt: z.string().min(1),
  universityId: z.string().optional(),
}).strict();

export const generateProposalInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  universityId: z.string().min(1),
  customTemplateId: z.string().optional(),
}).strict();

export const calculateBudgetInputSchema = z.object({
  budgetItems: z.array(budgetItemInputSchema).min(1),
  budgetLimit: z.number().positive().optional(),
}).strict();

export const validateBudgetInputSchema = calculateBudgetInputSchema.extend({
  budgetItems: z.array(budgetItemInputSchema.extend({ total: z.number().nonnegative().optional() })).min(1),
});

export const validateProposalInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  universityId: z.string().min(1),
}).strict();

export const repairProposalInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  universityId: z.string().min(1),
  validationIssues: z.array(z.object({
    section: z.string(),
    severity: z.enum(["error", "warning", "info"]),
    type: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })).default([]),
}).strict();

export const exportDocumentInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  universityId: z.string().min(1),
  format: z.enum(["docx", "markdown", "pdf"]),
  outputPath: z.string().optional(),
}).strict();

// ─── Custom Formatter Schemas ───────────────────────────────

export const createCustomTemplateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  formatting: universityFormattingSchema,
  sections: z.array(sectionDefinitionSchema),
}).strict();

export const listCustomTemplatesInputSchema = z.object({}).strict();

export const applyCustomFormatterInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  customTemplateId: z.string().min(1),
}).strict();

export const validateCustomFormatInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  customTemplateId: z.string().min(1),
}).strict();

// ─── Conversion Schemas ──────────────────────────────────────

export const convertUniversityFormatInputSchema = z.object({
  eventDetails: eventDetailsSchema,
  fromUniversityId: z.string().min(1),
  toUniversityId: z.string().min(1),
}).strict();

// ─── Approval Schemas ────────────────────────────────────────

export const getApprovalChecklistInputSchema = z.object({
  universityId: z.string().min(1),
}).strict();
