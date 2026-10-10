// ============================================================
// Gemini Client — REST API integration (no SDK dependency)
// Uses Google AI Studio REST API for function calling.
// API key from GEMINI_API_KEY environment variable.
// ============================================================

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GeminiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GeminiResponse {
  text?: string;
  functionCalls?: GeminiFunctionCall[];
  finishReason?: string;
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

/**
 * Call Gemini API with function calling support.
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

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const contents = conversationHistory || [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

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

  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // Extract response
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    return { finishReason: "STOP" };
  }

  const parts = candidate?.content?.parts || [];
  const textParts = parts.filter((p: { text?: string }) => p.text);
  const functionCallParts = parts.filter((p: { functionCall?: unknown }) => p.functionCall);

  const text = textParts.map((p: { text: string }) => p.text).join("");
  const functionCalls = functionCallParts.map((p: { functionCall: { name: string; args: Record<string, unknown> } }) => ({
    name: p.functionCall.name,
    args: p.functionCall.args || {},
  }));

  return {
    text: text || undefined,
    functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    finishReason: candidate?.finishReason,
  };
}
