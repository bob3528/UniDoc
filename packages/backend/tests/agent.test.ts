import { afterEach, describe, expect, it, vi } from "vitest";
import { runAgent } from "../src/gemini/agent.js";
import * as client from "../src/gemini/client.js";
import * as tools from "../src/gemini/tools.js";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe("Agent conversation", () => {
  it("does not report completion without a document", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    vi.spyOn(client, "callGemini").mockResolvedValue({ text: "Need dates", parts: [{ text: "Need dates" }] });
    const result = await runAgent("Create a proposal");
    expect(result.success).toBe(false);
    expect(result.finalText).toBe("Need dates");
  });
  it("preserves signatures and groups parallel call responses in one turn", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test");
    const calls = [{ name: "list_universities", args: {} }, { name: "export_document", args: {} }];
    const parts = calls.map(functionCall => ({ functionCall, thoughtSignature: "signature" }));
    const mock = vi.spyOn(client, "callGemini")
      .mockResolvedValueOnce({ functionCalls: calls, parts })
      .mockResolvedValueOnce({ text: "Done", parts: [{ text: "Done" }] });
    vi.spyOn(tools, "executeToolCall")
      .mockResolvedValueOnce({ result: { success: true } })
      .mockResolvedValueOnce({ result: { success: true, filePath: "output/test.docx" } });
    const result = await runAgent("Create a proposal");
    expect(result.success).toBe(true);
    expect(result.exportPath).toBe("output/test.docx");
    const history = mock.mock.calls[1][3]!;
    expect(history[1].parts).toEqual(parts);
    expect(history[2].role).toBe("user");
    expect(history[2].parts).toHaveLength(2);
  });
  it("returns a useful result when the key is absent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const result = await runAgent("Create a proposal");
    expect(result.success).toBe(false);
    expect(result.totalToolCalls).toBe(0);
    expect(result.error).toContain("direct API endpoints");
  });
});
