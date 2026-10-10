import { useState, useEffect, type ReactNode } from "react";
import { api, type UniversitySummary } from "./api.js";
import Dashboard from "./pages/Dashboard.js";
import AIWorkspace from "./pages/AIWorkspace.js";
import DocumentPreview from "./pages/DocumentPreview.js";
import CustomFormatter from "./pages/CustomFormatter.js";
import ValidationReport from "./pages/ValidationReport.js";

type Page = "dashboard" | "workspace" | "preview" | "formatter" | "validation";

interface NavItem {
  id: Page;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "M" },
  { id: "workspace", label: "AI Workspace", icon: "AI" },
  { id: "preview", label: "Document Preview", icon: "D" },
  { id: "formatter", label: "Custom Formatter", icon: "F" },
  { id: "validation", label: "Validation Report", icon: "V" },
];

// Shared state passed between pages
export interface AppSharedState {
  universities: UniversitySummary[];
  geminiAvailable: boolean;
  lastResult: import("./api.js").AgentResult | null;
  setLastResult: (result: import("./api.js").AgentResult | null) => void;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [universities, setUniversities] = useState<UniversitySummary[]>([]);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [lastResult, setLastResult] = useState<import("./api.js").AgentResult | null>(null);

  useEffect(() => {
    api.getUniversities().then((data) => setUniversities(data.universities)).catch(() => {});
    api.getGeminiStatus().then((data) => setGeminiAvailable(data.available)).catch(() => {});
  }, []);

  const sharedState: AppSharedState = {
    universities,
    geminiAvailable,
    lastResult,
    setLastResult,
    currentPage,
    setCurrentPage,
  };

  const renderPage = (): ReactNode => {
    switch (currentPage) {
      case "dashboard": return <Dashboard shared={sharedState} />;
      case "workspace": return <AIWorkspace shared={sharedState} />;
      case "preview": return <DocumentPreview shared={sharedState} />;
      case "formatter": return <CustomFormatter shared={sharedState} />;
      case "validation": return <ValidationReport shared={sharedState} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">UniDoc</h1>
              <p className="text-xs text-gray-500">One Prompt. Every University.</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? "bg-accent-50 text-accent-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                currentPage === item.id ? "bg-accent-600 text-white" : "bg-gray-200 text-gray-600"
              }`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Gemini status */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${geminiAvailable ? "bg-accent-500" : "bg-gray-300"}`} />
            <span className="text-gray-500">
              Gemini AI: {geminiAvailable ? "Ready" : "Not configured"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
