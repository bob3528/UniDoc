import { useState, useEffect } from "react";
import { api, type AgentResult, type AgentStep } from "../api.js";
import type { AppSharedState } from "../App.js";

const EXAMPLE_PROMPTS = [
  "Generate a UPM event proposal for a two-day AI workshop involving 100 students with a RM5,000 budget",
  "Create a UM kertas kerja for a one-day career fair with 200 participants and RM3,000 budget",
];

export default function AIWorkspace({ shared }: { shared: AppSharedState }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);

  useEffect(() => {
    if (shared.lastResult) setResult(shared.lastResult);
  }, [shared.lastResult]);

  async function handleRun() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.runAgent(prompt);
      setResult(res);
      shared.setLastResult(res);
    } catch (err) {
      setResult({
        success: false,
        steps: [],
        error: err instanceof Error ? err.message : String(err),
        totalToolCalls: 0,
        totalIterations: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Workspace</h1>
      <p className="text-gray-500 text-sm mb-6">Describe your event — UniDoc AI will generate, validate, repair, and export your proposal</p>

      {/* Prompt input */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Generate a UPM event proposal for a two-day AI workshop involving 100 students with a RM5,000 budget"
          className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-accent-400"
          maxLength={5000}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{prompt.length}/5000</span>
          <div className="flex gap-2">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-xs px-2 py-1 text-accent-600 bg-accent-50 rounded hover:bg-accent-100"
              >
                Example {i + 1}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={!prompt.trim() || loading}
          className="w-full mt-3 py-2.5 bg-accent-600 text-white font-medium rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Running Agent..." : "Generate Proposal"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-accent-50 border border-accent-100 rounded-lg mb-6">
          <div className="w-5 h-5 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-accent-700">AI agent is working... Generating, validating, and exporting your proposal</p>
        </div>
      )}

      {/* Execution trace */}
      {result && result.steps.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Execution Trace</h2>
          <div className="space-y-2">
            {result.steps.map((step) => (
              <StepItem key={step.step} step={step} />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            <span>Iterations: {result.totalIterations}</span>
            <span>Tool calls: {result.totalToolCalls}</span>
            <span className={result.success ? "text-accent-600" : "text-red-500"}>
              Status: {result.success ? "Success" : "Failed"}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {result && !result.success && result.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <div className="space-y-6">
          {/* Final text */}
          {result.finalText && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Summary</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{result.finalText}</p>
            </div>
          )}

          {/* Download */}
          {result.exportPath && (
            <div className="bg-accent-50 border border-accent-200 rounded-xl p-6">
              <h2 className="font-semibold text-accent-900 mb-3">Document Ready</h2>
              <p className="text-sm text-accent-700 mb-3">Your proposal has been exported:</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const filename = result.exportPath?.split("/").pop() || "";
                    if (filename) api.downloadFile(filename);
                  }}
                  className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700"
                >
                  Download DOCX
                </button>
                <button
                  onClick={() => shared.setCurrentPage("preview")}
                  className="px-4 py-2 bg-white text-accent-700 text-sm font-medium rounded-lg hover:bg-accent-50 border border-accent-200"
                >
                  Preview Document
                </button>
              </div>
            </div>
          )}

          {/* Validation report */}
          {result.validationReport && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Validation Report</h2>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  result.validationReport.status === "pass" ? "bg-accent-100 text-accent-700" :
                  result.validationReport.status === "warning" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {result.validationReport.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {result.validationReport.errorCount} errors, {result.validationReport.warningCount} warnings
              </p>
              {result.validationReport.issues.length > 0 && (
                <div className="space-y-2">
                  {result.validationReport.issues.map((issue, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className={`px-1.5 py-0.5 text-xs rounded font-medium ${
                        issue.severity === "error" ? "bg-red-100 text-red-700" :
                        issue.severity === "warning" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{issue.severity}</span>
                      <span className="text-gray-600">{issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepItem({ step }: { step: AgentStep }) {
  const icons: Record<string, string> = {
    gemini_call: "AI",
    tool_call: "T",
    tool_result: "R",
    final: "✓",
    error: "!",
  };
  const colors: Record<string, string> = {
    gemini_call: "bg-blue-100 text-blue-600",
    tool_call: "bg-accent-100 text-accent-700",
    tool_result: "bg-gray-100 text-gray-600",
    final: "bg-accent-600 text-white",
    error: "bg-red-100 text-red-600",
  };

  return (
    <div className="flex items-start gap-3">
      <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${colors[step.type] || "bg-gray-100"}`}>
        {icons[step.type] || "?"}
      </span>
      <div className="flex-1">
        <p className="text-sm text-gray-700">{step.description}</p>
        {!!step.data && (
          <details className="mt-1">
            <summary className="text-xs text-gray-400 cursor-pointer">Details</summary>
            <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(step.data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
