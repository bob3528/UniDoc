import type { AppSharedState } from "../App.js";
import { api, type ProposalSection } from "../api.js";

export default function DocumentPreview({ shared }: { shared: AppSharedState }) {
  const result = shared.lastResult;
  const proposal = result?.proposal;

  if (!proposal) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Document Preview</h1>
        <div className="mt-8 p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
          <p className="text-gray-400">No document generated yet.</p>
          <button
            onClick={() => shared.setCurrentPage("workspace")}
            className="mt-3 px-4 py-2 bg-accent-600 text-white text-sm rounded-lg hover:bg-accent-700"
          >
            Go to AI Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Preview</h1>
          <p className="text-sm text-gray-500">{proposal.eventDetails.title}</p>
        </div>
        {result?.exportPath && (
          <button
            onClick={() => {
              const filename = result.exportPath?.split("/").pop() || "";
              if (filename) api.downloadFile(filename);
            }}
            className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700"
          >
            Download DOCX
          </button>
        )}
      </div>

      {/* Event summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3 text-sm">Event Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">Organiser:</span> <span className="text-gray-700">{proposal.eventDetails.organiser}</span></div>
          <div><span className="text-gray-400">University:</span> <span className="text-gray-700">{proposal.universityProfileId}</span></div>
          <div><span className="text-gray-400">Dates:</span> <span className="text-gray-700">{proposal.eventDetails.startDate} to {proposal.eventDetails.endDate}</span></div>
          <div><span className="text-gray-400">Venue:</span> <span className="text-gray-700">{proposal.eventDetails.venue}</span></div>
          <div><span className="text-gray-400">Participants:</span> <span className="text-gray-700">{proposal.eventDetails.targetParticipants}</span></div>
          {proposal.eventDetails.budgetLimit && (
            <div><span className="text-gray-400">Budget Limit:</span> <span className="text-gray-700">RM{proposal.eventDetails.budgetLimit.toFixed(2)}</span></div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {proposal.sections.map((section, i) => (
          <SectionView key={section.sectionId} section={section} index={i} />
        ))}
      </div>
    </div>
  );
}

function SectionView({ section, index }: { section: ProposalSection; index: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="font-semibold text-gray-900 mb-3">{index + 1}. {section.title}</h2>

      {section.content && (
        <div className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
          {section.content}
        </div>
      )}

      {section.tableData && section.tableData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {section.tableData[0].map((header, j) => (
                  <th key={j} className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.tableData.slice(1).map((row, ri) => (
                <tr key={ri} className={ri === section.tableData!.length - 2 ? "bg-accent-50 font-medium" : ""}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-600 border-b border-gray-100">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
