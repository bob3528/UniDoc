// ============================================================
// Gemini Agent — Bounded execution loop with function calling
// Max 10 iterations, max 15 tool calls, 30s timeout per call
// ============================================================

import { callGemini, isGeminiAvailable, type GeminiFunctionCall } from "./client.js";
import { geminiToolDeclarations, executeToolCall } from "./tools.js";

const MAX_ITERATIONS = 10;
const MAX_TOOL_CALLS = 15;

const SYSTEM_INSTRUCTION = `You are UniDoc AI, an assistant that helps Malaysian university students generate event proposals (kertas kerja).

Your workflow:
1. Understand the user's event request (title, dates, venue, participants, budget, etc.)
2. Call list_universities to find available university templates
3. Call get_university_rules to load the formatting requirements for the requested university
4. Extract event details from the user's request and structure them as eventDetails
5. Call generate_proposal with the structured eventDetails and universityId
6. Call validate_proposal to check for issues
7. If issues are found, call repair_proposal to fix them
8. Call export_document to generate the final DOCX
9. Return a summary of what was generated, any remaining issues, and the file path

IMPORTANT RULES:
- Extract as much information as possible from the user's request
- If essential information is missing, use reasonable defaults and mark them clearly (e.g., student names as "[TBA]")
- NEVER fabricate official approvals, signatures, or university policies
- Calculate budget totals correctly (quantity × unitPrice)
- If the budget exceeds the limit, report the overrun
- Always call export_document at the end to produce the downloadable file
- Keep your final text response concise and focused on what was accomplished

The eventDetails object structure:
{
  "title": "Program title",
  "university": "upm",
  "organiser": "Club/society name",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "startDate": "2026-11-15",
  "endDate": "2026-11-16",
  "venue": "Venue name",
  "targetParticipants": 100,
  "activities": [{"time": "08:00-09:00", "description": "Registration", "facilitator": "Committee"}],
  "budget": [{"category": "Food", "description": "Lunch", "quantity": 100, "unitPrice": 15}],
  "budgetLimit": 5000,
  "committee": [{"position": "Chairman", "name": "Student Name", "studentId": "ID", "faculty": "Faculty"}],
  "expectedOutcomes": ["Outcome 1", "Outcome 2"]
}`;

export interface AgentStep {
  step: number;
  type: "gemini_call" | "tool_call" | "tool_result" | "final" | "error";
  description: string;
  data?: unknown;
  timestamp: string;
}

export interface AgentResult {
  success: boolean;
  steps: AgentStep[];
  finalText?: string;
  exportPath?: string;
  proposal?: unknown;
  validationReport?: unknown;
  repairResult?: unknown;
  error?: string;
  totalToolCalls: number;
  totalIterations: number;
}

/**
 * Run the bounded agent execution loop.
 * Returns an execution trace with all steps.
 */
export async function runAgent(prompt: string): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const startTime = Date.now();

  if (!isGeminiAvailable()) {
    steps.push({
      step: 0,
      type: "error",
      description: "Gemini API key not configured. Set GEMINI_API_KEY in backend/.env",
      timestamp: new Date().toISOString(),
    });
    return {
      success: false,
      steps,
      error: "GEMINI_API_KEY not configured. The AI agent requires a Google Gemini API key. You can still use the direct API endpoints without AI.",
      totalToolCalls: 0,
      totalIterations: 0,
    };
  }

  let conversationHistory: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [
    { role: "user", parts: [{ text: prompt }] },
  ];

  let totalToolCalls = 0;
  let exportPath: string | undefined;
  let proposal: unknown | undefined;
  let validationReport: unknown | undefined;
  let repairResult: unknown | undefined;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    steps.push({
      step: steps.length,
      type: "gemini_call",
      description: `Gemini iteration ${iteration + 1}`,
      timestamp: new Date().toISOString(),
    });

    let geminiResponse;
    try {
      geminiResponse = await callGemini(
        prompt,
        SYSTEM_INSTRUCTION,
        geminiToolDeclarations,
        conversationHistory,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      steps.push({
        step: steps.length,
        type: "error",
        description: `Gemini API error: ${message}`,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        steps,
        error: message,
        totalToolCalls,
        totalIterations: iteration + 1,
      };
    }

    // Add Gemini's response to conversation
    const responseParts: Array<Record<string, unknown>> = [];
    if (geminiResponse.text) {
      responseParts.push({ text: geminiResponse.text });
    }
    if (geminiResponse.functionCalls) {
      for (const fc of geminiResponse.functionCalls) {
        responseParts.push({ functionCall: { name: fc.name, args: fc.args } });
      }
    }
    conversationHistory.push({ role: "model", parts: responseParts });

    // If no function calls, we're done — Gemini returned a text response
    if (!geminiResponse.functionCalls || geminiResponse.functionCalls.length === 0) {
      steps.push({
        step: steps.length,
        type: "final",
        description: "Agent completed",
        data: { finalText: geminiResponse.text },
        timestamp: new Date().toISOString(),
      });
      return {
        success: true,
        steps,
        finalText: geminiResponse.text,
        exportPath,
        proposal,
        validationReport,
        repairResult,
        totalToolCalls,
        totalIterations: iteration + 1,
      };
    }

    // Execute each function call
    for (const fc of geminiResponse.functionCalls) {
      totalToolCalls++;
      if (totalToolCalls > MAX_TOOL_CALLS) {
        steps.push({
          step: steps.length,
          type: "error",
          description: `Maximum tool calls (${MAX_TOOL_CALLS}) exceeded`,
          timestamp: new Date().toISOString(),
        });
        return {
          success: false,
          steps,
          error: `Maximum tool calls (${MAX_TOOL_CALLS}) exceeded`,
          exportPath,
          proposal,
          validationReport,
          totalToolCalls,
          totalIterations: iteration + 1,
        };
      }

      steps.push({
        step: steps.length,
        type: "tool_call",
        description: `Tool: ${fc.name}`,
        data: fc.args,
        timestamp: new Date().toISOString(),
      });

      const { result, error } = await executeToolCall(fc.name, fc.args);

      // Track important results
      if (fc.name === "export_document" && result && typeof result === "object") {
        const r = result as { filePath?: string };
        if (r.filePath) exportPath = r.filePath;
      }
      if (fc.name === "generate_proposal" && result && typeof result === "object") {
        const r = result as { proposal?: unknown };
        if (r.proposal) proposal = r.proposal;
      }
      if (fc.name === "validate_proposal" && result && typeof result === "object") {
        const r = result as { report?: unknown };
        if (r.report) validationReport = r.report;
      }
      if (fc.name === "repair_proposal" && result && typeof result === "object") {
        const r = result as { result?: unknown };
        if (r.result) repairResult = r.result;
      }

      // Add tool result to conversation history
      conversationHistory.push({
        role: "user",
        parts: [{ functionResponse: { name: fc.name, response: result } }],
      });

      steps.push({
        step: steps.length,
        type: "tool_result",
        description: `${fc.name} result`,
        data: error ? { error } : result,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Exhausted max iterations
  return {
    success: false,
    steps,
    error: `Maximum iterations (${MAX_ITERATIONS}) reached without completion`,
    exportPath,
    proposal,
    validationReport,
    repairResult,
    totalToolCalls,
    totalIterations: MAX_ITERATIONS,
  };
}
