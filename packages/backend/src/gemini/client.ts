import { getGeminiModel, getGeminiFallbackModel, getGeminiBaseBackoffMs } from "../config.js";
// ============================================================
// Gemini Client — REST API integration (no SDK dependency)
// Uses Google AI Studio REST API for function calling.
// API key from GEMINI_API_KEY environment variable.
//
// Resilience features:
// - Automatic retry with exponential backoff for HTTP 503 and 429
// - Respects Retry-After header (seconds or HTTP-date format)
// - Falls back to a secondary model if primary is overloaded
// - Maximum 2 retries on primary, 1 attempt on fallback (cost-minimising)
// ============================================================

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MAX_RETRIES = 2;
const MAX_BACKOFF_MS = 10_000;

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiResponse {
  text?: string;
  functionCalls?: GeminiFunctionCall[];
  finishReason?: string;
  parts?: Array<Record<string, unknown>>;
}

/**
 * Get the Gemini API key from environment.
 */
export function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

/**
 * Check if Gemini is available (API key configured).
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse the Retry-After header value into milliseconds.
 * Supports both delta-seconds ("30") and HTTP-date format.
 * Returns null when the header is absent or unparseable.
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return null;
}

/**
 * Compute the backoff delay for a given attempt.
 * If a Retry-After value is available, use it (capped at MAX_BACKOFF_MS).
 * Otherwise use exponential backoff: base * 2^attempt.
 */
function computeBackoff(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs !== null) return Math.min(retryAfterMs, MAX_BACKOFF_MS);
  const base = getGeminiBaseBackoffMs();
  return Math.min(base * 2 ** attempt, MAX_BACKOFF_MS);
}

/**
 * Build the request body (shared across primary and fallback calls).
 */
function buildRequestBody(
  contents: Array<{ role: string; parts: Array<Record<string, unknown>> }>,
  systemInstruction: string,
  tools: GeminiFunctionDeclaration[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };
  if (tools.length > 0) {
    body.tools = [{ functionDeclarations: tools }];
  }
  return body;
}

/**
 * Perform a single fetch to the Gemini generateContent endpoint.
 */
function fetchGemini(
  model: string,
  body: Record<string, unknown>,
  apiKey: string,
): Promise<Response> {
  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify(body),
  });
}

/**
 * Parse a successful (HTTP 200) Gemini response into GeminiResponse.
 * Throws if no candidate is returned.
 */
function parseGeminiResponse(data: Record<string, unknown>): GeminiResponse {
  const candidate = (data as { candidates?: Array<Record<string, unknown>> })?.candidates?.[0];
  if (!candidate) {
    const blockReason = (data as { promptFeedback?: { blockReason?: string } })?.promptFeedback?.blockReason;
    throw new Error(`Gemini returned no candidate (${blockReason || "empty response"})`);
  }

  const parts = (candidate as { content?: { parts?: Array<Record<string, unknown>> } })?.content?.parts || [];
  const textParts = parts.filter((p) => "text" in p && typeof p.text === "string");
  const functionCallParts = parts.filter((p) => "functionCall" in p);

  const text = textParts.map((p) => (p as { text: string }).text).join("");
  const functionCalls = functionCallParts.map(
    (p) => {
      const fc = (p as { functionCall: { name: string; args: Record<string, unknown> } }).functionCall;
      return { name: fc.name, args: fc.args || {} };
    },
  );

  return {
    text: text || undefined,
    functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    finishReason: (candidate as { finishReason?: string })?.finishReason,
    parts,
  };
}

/**
 * Build a redacted error from a non-OK HTTP response.
 */
function buildHttpError(response: Response, apiKey: string): Promise<Error> {
  return response.text().then(
    (errorText) =>
      new Error(
        `Gemini API error (${response.status}): ${errorText.replaceAll(apiKey, "[REDACTED]").slice(0, 300)}`,
      ),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call Gemini API with function calling support.
 *
 * Retry policy:
 * - HTTP 503 (UNAVAILABLE) and 429 (RATE_LIMIT_EXCEEDED) are retried up to
 *   MAX_RETRIES times with exponential backoff.
 * - If a Retry-After header is present, it takes precedence over the computed
 *   backoff (capped at MAX_BACKOFF_MS to avoid excessive blocking).
 * - After the primary model exhausts retries, a single attempt is made on the
 *   fallback model (no retries on fallback — minimises cost).
 * - All other HTTP errors and non-HTTP exceptions propagate immediately.
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string,
  tools: GeminiFunctionDeclaration[],
  conversationHistory?: Array<{ role: string; parts: Array<Record<string, unknown>> }>,
): Promise<GeminiResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured. Set it in backend .env file.");
  }

  const primaryModel = getGeminiModel();
  const fallbackModel = getGeminiFallbackModel();

  const contents = conversationHistory || [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const body = buildRequestBody(contents, systemInstruction, tools);

  let lastError: Error | null = null;
  let fellBackDueToOverload = false;

  // --- Primary model with retries ---
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetchGemini(primaryModel, body, apiKey);

    if (response.ok) {
      const data = await response.json();
      return parseGeminiResponse(data as Record<string, unknown>);
    }

    const isRetryable = response.status === 503 || response.status === 429;
    const canRetry = attempt < MAX_RETRIES;

    if (isRetryable && canRetry) {
      const retryAfterMs = parseRetryAfter(response.headers.get("Retry-After"));
      const delay = computeBackoff(attempt, retryAfterMs);
      console.warn(
        `[gemini] ${primaryModel} returned ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms…`,
      );
      await sleep(delay);
      continue;
    }

    // Non-retryable or retries exhausted — record error and fall through.
    // Only attempt the fallback model when the failure was due to overload/rate
    // limiting; a 400/401/403 means the request itself is invalid and a
    // different model won't help.
    if (isRetryable) fellBackDueToOverload = true;
    lastError = await buildHttpError(response, apiKey);
    break;
  }

  // --- Fallback model (single attempt, no retry) ---
  if (fellBackDueToOverload && fallbackModel && fallbackModel !== primaryModel && lastError) {
    console.warn(`[gemini] Primary model ${primaryModel} exhausted retries. Falling back to ${fallbackModel}…`);
    const response = await fetchGemini(fallbackModel, body, apiKey);

    if (response.ok) {
      const data = await response.json();
      return parseGeminiResponse(data as Record<string, unknown>);
    }

    lastError = await buildHttpError(response, apiKey);
  }

  throw lastError || new Error("Gemini API call failed after retries");
}
