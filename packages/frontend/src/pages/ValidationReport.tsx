import type { AppSharedState } from "../App.js";
import type { ValidationIssue, RepairResult } from "../api.js";

export default function ValidationReport({ shared }: { shared: AppSharedState }) {
  const result = shared.lastResult;

  if (!result) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Validation Report</h1>
        <div className="mt-8 p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
          <p className="text-gray-400">No validation results available.</p>
          <button
            onClick={() => shared.setCurrentPage("workspace")}
            className="mt-3 px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-700"
          >
            Generate a Proposal
          </button>
        </div>
      </div>
    );
  }

  const report = result.validationReport;
  const repair = result.repairResult;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Validation Report</h1>
      <p className="text-gray-500 text-sm mb-6">Issues found and repairs applied during proposal generation</p>

      {/* Overall status */}
      {report && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Validation Status</h2>
            <span className={`px-3 py-1 text-sm rounded-full ${
              report.status === "pass" ? "bg-accent-100 text-accent-700" :
              report.status === "warning" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              {report.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{report.totalIssues}</p>
              <p className="text-xs text-gray-500">Total Issues</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{report.errorCount}</p>
              <p className="text-xs text-red-500">Errors</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{report.warningCount}</p>
              <p className="text-xs text-amber-500">Warnings</p>
            </div>
          </div>
        </div>
      )}

      {/* Repair actions */}
      {repair && repair.actions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-gray-900">Auto-Repair Actions</h2>
            <span className="px-2 py-0.5 text-xs bg-accent-100 text-accent-700 rounded-full">
              {repair.actions.length} applied
            </span>
          </div>
          <div className="space-y-2">
            {repair.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-accent-50 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs flex-shrink-0">✓</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{action.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Section: {action.section} · Type: {action.issueType}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All issues */}
      {report && report.issues.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">All Issues</h2>
          <div className="space-y-2">
            {report.issues.map((issue, i) => (
              <IssueItem key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Remaining issues after repair */}
      {repair && repair.remainingIssues.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-semibold text-amber-900 mb-3">Remaining Issues (Require User Attention)</h2>
          <div className="space-y-2">
            {repair.remainingIssues.map((issue, i) => (
              <IssueItem key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* No issues */}
      {report && report.issues.length === 0 && (
        <div className="bg-accent-50 border border-accent-200 rounded-xl p-8 text-center">
          <p className="text-accent-700 font-medium">No issues found — the proposal passed all validation checks.</p>
        </div>
      )}
    </div>
  );
}

function IssueItem({ issue }: { issue: ValidationIssue }) {
  const colors: Record<string, string> = {
    error: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className={`flex items-start gap-3 p-3 border rounded-lg ${colors[issue.severity] || colors.info}`}>
      <span className="px-2 py-0.5 text-xs font-medium rounded bg-white bg-opacity-50">
        {issue.severity.toUpperCase()}
      </span>
      <div className="flex-1">
        <p className="text-sm">{issue.message}</p>
        <p className="text-xs opacity-70 mt-0.5">Section: {issue.section}</p>
        {issue.suggestion && (
          <p className="text-xs mt-1 italic">→ {issue.suggestion}</p>
        )}
      </div>
    </div>
  );
}
