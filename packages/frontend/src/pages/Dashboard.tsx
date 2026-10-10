import type { AppSharedState } from "../App.js";

export default function Dashboard({ shared }: { shared: AppSharedState }) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500">Generate university event proposals with AI</p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => shared.setCurrentPage("workspace")}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:border-accent-300 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
              <span className="text-accent-700 font-bold">U</span>
            </div>
            <h2 className="font-semibold text-gray-900">UniDoc Campus</h2>
          </div>
          <p className="text-sm text-gray-500">Generate university event proposals (kertas kerja) with AI</p>
        </button>

        <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-left opacity-60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 font-bold">B</span>
            </div>
            <h2 className="font-semibold text-gray-700">UniDoc Business</h2>
          </div>
          <p className="text-sm text-gray-400">Business quotations (coming soon)</p>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => shared.setCurrentPage("workspace")}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-accent-300 transition-all text-left"
        >
          <p className="font-medium text-gray-900 text-sm">New AI Proposal</p>
          <p className="text-xs text-gray-500 mt-1">Describe your event in natural language</p>
        </button>
        <button
          onClick={() => shared.setCurrentPage("formatter")}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-accent-300 transition-all text-left"
        >
          <p className="font-medium text-gray-900 text-sm">Custom Formatter</p>
          <p className="text-xs text-gray-500 mt-1">Create reusable formatting templates</p>
        </button>
        <button
          onClick={() => shared.setCurrentPage("validation")}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-accent-300 transition-all text-left"
        >
          <p className="font-medium text-gray-900 text-sm">Validation Report</p>
          <p className="text-xs text-gray-500 mt-1">Check proposals for errors</p>
        </button>
      </div>

      {/* Available universities */}
      <h2 className="font-semibold text-gray-900 mb-3">Available University Templates</h2>
      <div className="space-y-2">
        {shared.universities.map((uni) => (
          <div key={uni.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{uni.fullName}</span>
                {!uni.isVerified && (
                  <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">Demo</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{uni.sectionCount} sections</p>
            </div>
            <span className="text-sm text-gray-400 font-mono">{uni.id}</span>
          </div>
        ))}
      </div>

      {/* Gemini status */}
      {!shared.geminiAvailable && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Gemini AI not configured.</strong> Set <code className="px-1 py-0.5 bg-amber-100 rounded">GEMINI_API_KEY</code> in <code className="px-1 py-0.5 bg-amber-100 rounded">packages/backend/.env</code> to enable AI-powered proposal generation. Direct API endpoints still work without AI.
          </p>
        </div>
      )}
    </div>
  );
}
