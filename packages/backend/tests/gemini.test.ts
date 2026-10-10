import { afterEach, describe, expect, it, vi } from "vitest";
import { callGemini } from "../src/gemini/client.js";
import { geminiToolDeclarations, executeToolCall } from "../src/gemini/tools.js";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Gemini request compatibility", () => {
  it("provides concrete object properties and array items for every tool", () => {
    function inspect(schema: any) {
      expect(schema).not.toHaveProperty("additionalProperties");
      if (schema.type === "array") { expect(schema.items).toBeDefined(); inspect(schema.items); }
      if (schema.type === "object") { expect(schema.properties).toBeDefined(); Object.values(schema.properties).forEach(inspect); }
    }
    geminiToolDeclarations.forEach(tool => { if (tool.parameters) inspect(tool.parameters); });
  });
  it("sends the configured model, header key, timeout, and preserves model parts", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-secret"); vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    const parts = [{ functionCall: { name: "list_universities", args: {} }, thoughtSignature: "signature" }];
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts }, finishReason: "STOP" }] })));
    vi.stubGlobal("fetch", mock);
    const response = await callGemini("test", "system", geminiToolDeclarations);
    const [url, options] = mock.mock.calls[0];
    expect(url).toContain("gemini-2.5-flash:generateContent"); expect(url).not.toContain("fake-secret");
    expect(options.headers["x-goog-api-key"]).toBe("fake-secret"); expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(response.parts).toEqual(parts);
  });
  it("redacts the key from provider errors and rejects empty candidates", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-secret");
    vi.stubEnv("GEMINI_BASE_BACKOFF_MS", "1"); // minimise test delay for 429 retries
    // mockImplementation returns a fresh Response each call (body can only be read once)
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("fake-secret quota", { status: 429 }))));
    await expect(callGemini("test", "system", [])).rejects.toThrow("[REDACTED]");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    await expect(callGemini("test", "system", [])).rejects.toThrow("no candidate");
  });
  it("retries 503 up to 2 times then falls back to the secondary model", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-secret");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-2.0-flash");
    vi.stubEnv("GEMINI_BASE_BACKOFF_MS", "1");

    const okBody = JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }] });
    // Primary: 3x 503, then fallback: 1x 200
    const sequence = [
      new Response("overloaded", { status: 503 }),
      new Response("overloaded", { status: 503 }),
      new Response("overloaded", { status: 503 }),
      new Response(okBody),
    ];
    const mock = vi.fn();
    sequence.forEach(r => mock.mockResolvedValueOnce(r));
    vi.stubGlobal("fetch", mock);

    const res = await callGemini("test", "system", []);
    expect(res.text).toBe("ok");
    // 3 calls to primary + 1 call to fallback
    expect(mock).toHaveBeenCalledTimes(4);
    // First 3 calls use primary model
    expect(mock.mock.calls[0][0]).toContain("gemini-2.5-flash");
    expect(mock.mock.calls[2][0]).toContain("gemini-2.5-flash");
    // 4th call uses fallback model
    expect(mock.mock.calls[3][0]).toContain("gemini-2.0-flash");
  });
  it("respects Retry-After header instead of exponential backoff", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-secret");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", ""); // disable fallback to isolate retry timing
    vi.stubEnv("GEMINI_BASE_BACKOFF_MS", "5000"); // would be 5s without Retry-After
    const okBody = JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] }, finishReason: "STOP" }] });
    const mock = vi.fn();
    mock.mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "Retry-After": "0" } }))
        .mockResolvedValueOnce(new Response(okBody));
    vi.stubGlobal("fetch", mock);
    const start = Date.now();
    const res = await callGemini("test", "system", []);
    const elapsed = Date.now() - start;
    expect(res.text).toBe("ok");
    expect(mock).toHaveBeenCalledTimes(2);
    // Retry-After: 0s means near-zero delay, not 5s exponential backoff
    expect(elapsed).toBeLessThan(2000);
  });
  it("does not retry on non-503/429 errors (e.g. 400 Bad Request)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-secret");
    const mock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", mock);
    await expect(callGemini("test", "system", [])).rejects.toThrow("400");
    expect(mock).toHaveBeenCalledTimes(1);
  });
  it("validates model tool arguments before calling the engines", async () => {
    const result = await executeToolCall("generate_proposal", { universityId: "upm", eventDetails: {} });
    expect(result.error).toBeDefined();
    expect((result.result as any).success).toBe(false);
  });
});
