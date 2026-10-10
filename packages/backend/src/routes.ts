// ============================================================
// API Routes — Express route handlers
// Reuses UniDoc engines from @unidoc/mcp-server/services
// ============================================================

import type { Application, Request, Response } from "express";
import { runAgent } from "./gemini/agent.js";
import { isGeminiAvailable } from "./gemini/client.js";
import { getGeminiModel, outputDirectory } from "./config.js";
import { exportDocument } from "./export.js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { generateProposalInputSchema, validateProposalInputSchema, repairProposalInputSchema,
  calculateBudgetInputSchema, validateBudgetInputSchema, createCustomTemplateInputSchema, eventDetailsSchema } from "@unidoc/shared";

const eventSchema = eventDetailsSchema;
const exportSchema = z.object({ eventDetails: eventSchema, universityId: z.string().min(1),
  format: z.enum(["docx", "markdown"]) }).strict();
const requestSchemas: Record<string, z.ZodTypeAny> = {
  "/api/proposal/generate": generateProposalInputSchema.extend({ eventDetails: eventSchema }).omit({customTemplateId: true}),
  "/api/proposal/validate": validateProposalInputSchema.extend({ eventDetails: eventSchema }),
  "/api/proposal/repair": repairProposalInputSchema.extend({ eventDetails: eventSchema }),
  "/api/budget/calculate": calculateBudgetInputSchema,
  "/api/budget/validate": validateBudgetInputSchema,
  "/api/export": exportSchema,
  "/api/templates": createCustomTemplateInputSchema,
  "/api/agent": z.object({ prompt: z.string().trim().min(1).max(5000) }).strict(),
};

export function registerRoutes(app: Application): void {
  app.use((req: Request, res: Response, next: () => void) => {
    const schema = req.method === "POST" ? requestSchemas[req.path.toLowerCase().replace(/\/+$/, "")] : undefined;
    if (!schema) return next();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid request", issues: parsed.error.issues });
      return;
    }
    req.body = parsed.data;
    if (req.body.eventDetails && req.body.eventDetails.university !== req.body.universityId) {
      res.status(400).json({ success: false, error: "eventDetails.university must match universityId" });
      return;
    }
    next();
  });
  // ─── Health & Status ────────────────────────────────────

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/gemini/status", (_req, res) => {
    res.json({ available: isGeminiAvailable(), model: getGeminiModel() });
  });

  // ─── Universities ───────────────────────────────────────

  app.get("/api/universities", async (_req, res) => {
    try {
      const { listUniversities, getUniversitySummary } = await import("@unidoc/mcp-server/services");
      const universities = listUniversities();
      const summaries = universities.map((u) => getUniversitySummary(u.id)!);
      res.json({ success: true, count: summaries.length, universities: summaries });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get("/api/universities/:id", async (req, res) => {
    try {
      const { getUniversity } = await import("@unidoc/mcp-server/services");
      const profile = getUniversity(req.params.id);
      if (!profile) {
        res.status(404).json({ success: false, error: `University "${req.params.id}" not found` });
        return;
      }
      res.json({ success: true, university: profile });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── Proposal Generation (direct, no AI) ───────────────

  app.post("/api/proposal/generate", async (req, res) => {
    try {
      const { eventDetails, universityId } = req.body;
      const { getUniversity, buildProposalSections } = await import("@unidoc/mcp-server/services");
      const profile = getUniversity(universityId);
      if (!profile) {
        res.status(404).json({ success: false, error: `University "${universityId}" not found` });
        return;
      }
      const sections = buildProposalSections(eventDetails, profile);
      res.json({
        success: true,
        proposal: {
          id: `proposal-${randomUUID()}`,
          eventDetails,
          universityProfileId: universityId,
          sections,
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── Proposal Validation ────────────────────────────────

  app.post("/api/proposal/validate", async (req, res) => {
    try {
      const { eventDetails, universityId } = req.body;
      const { getUniversity, buildProposalSections, validateProposal } = await import("@unidoc/mcp-server/services");
      const profile = getUniversity(universityId);
      if (!profile) {
        res.status(404).json({ success: false, error: `University "${universityId}" not found` });
        return;
      }
      const sections = buildProposalSections(eventDetails, profile);
      const report = validateProposal(eventDetails, profile, sections);
      report.proposalId = `proposal-${randomUUID()}`;
      res.json({ success: true, report });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── Proposal Repair ─────────────────────────────────────

  app.post("/api/proposal/repair", async (req, res) => {
    try {
      const { eventDetails, universityId, validationIssues } = req.body;
      const { getUniversity, repairProposal, buildProposalSections } = await import("@unidoc/mcp-server/services");
      const profile = getUniversity(universityId);
      if (!profile) {
        res.status(404).json({ success: false, error: `University "${universityId}" not found` });
        return;
      }
      const result = repairProposal(eventDetails, profile, validationIssues || []);
      result.proposalId = `proposal-${randomUUID()}`;
      const sections = buildProposalSections(eventDetails, profile);
      res.json({ success: true, result, eventDetails, repairedSections: sections });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── Budget ─────────────────────────────────────────────

  app.post("/api/budget/calculate", async (req, res) => {
    try {
      const { budgetItems, budgetLimit } = req.body;
      const { calculateBudget } = await import("@unidoc/mcp-server/services");
      const summary = calculateBudget(budgetItems, budgetLimit);
      res.json({ success: true, summary });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post("/api/budget/validate", async (req, res) => {
    try {
      const { budgetItems, budgetLimit } = req.body;
      const { validateBudget } = await import("@unidoc/mcp-server/services");
      const result = validateBudget(budgetItems, budgetLimit);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── Export ─────────────────────────────────────────────

  app.post("/api/export", async (req, res) => {
    try {
      const { eventDetails, universityId, format } = req.body;
      const { getUniversity } = await import("@unidoc/mcp-server/services");
      const profile = getUniversity(universityId);
      if (!profile) {
        res.status(404).json({ success: false, error: "University not found" });
        return;
      }
      res.json(await exportDocument(eventDetails, profile, format));
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── File Download ───────────────────────────────────────

  app.get("/api/download/:filename", (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9_-]+\.(docx|md)$/.test(filename)) {
      res.status(400).json({ success: false, error: "Invalid filename" });
      return;
    }
    const path = join(outputDirectory, filename);
    if (!existsSync(path)) {
      res.status(404).json({ success: false, error: "File not found" });
      return;
    }
    res.download(path);
  });

  // ─── Approval Checklist ─────────────────────────────────

  app.get("/api/approval/:universityId", async (req, res) => {
    try {
      const { getUniversity } = await import("@unidoc/mcp-server/services");
      const profile = getUniversity(req.params.universityId);
      if (!profile) {
        res.status(404).json({ success: false, error: `University "${req.params.universityId}" not found` });
        return;
      }
      res.json({
        success: true,
        checklist: profile.approvalFlow,
        supportingDocuments: profile.supportingDocuments,
        isVerified: profile.isVerified,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── Custom Templates ───────────────────────────────────

  app.get("/api/templates", async (_req, res) => {
    try {
      const { listCustomTemplates } = await import("@unidoc/mcp-server/services");
      const templates = listCustomTemplates();
      res.json({
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
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const { name, description, formatting, sections } = req.body;
      const { createCustomTemplate } = await import("@unidoc/mcp-server/services");
      const template = createCustomTemplate({ name, description, formatting, sections });
      res.json({ success: true, template });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const { getCustomTemplate } = await import("@unidoc/mcp-server/services");
      const template = getCustomTemplate(req.params.id);
      if (!template) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }
      res.json({ success: true, template });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ─── AI Agent (Gemini-powered) ──────────────────────────

  app.post("/api/agent", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string" || prompt.length > 5000) {
        res.status(400).json({ success: false, error: "Prompt is required (max 5000 characters)" });
        return;
      }
      const result = await runAgent(prompt);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });
}
