// ============================================================
// Markdown Generator — Exports proposal as Markdown
// ============================================================

import type { ProposalSection, UniversityProfile, EventDetails } from "@unidoc/shared";

/**
 * Convert a table (string[][]) to a Markdown table.
 */
function tableToMarkdown(rows: string[][]): string {
  if (rows.length === 0) return "";

  const header = rows[0];
  const separator = header.map(() => "---");
  const dataRows = rows.slice(1);

  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...dataRows.map((row) => `| ${row.join(" | ")} |`),
  ];

  return lines.join("\n");
}

/**
 * Generate a Markdown document from proposal sections.
 */
export function generateMarkdown(
  sections: ProposalSection[],
  profile: UniversityProfile,
  eventDetails: EventDetails,
): string {
  const lines: string[] = [];

  // Document title
  lines.push(`# ${profile.fullName}`);
  lines.push("");
  lines.push(`## ${eventDetails.title}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Generate each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionNum = i + 1;

    lines.push(`## ${sectionNum}. ${section.title}`);
    lines.push("");

    if (section.content) {
      lines.push(section.content);
      lines.push("");
    }

    if (section.tableData && section.tableData.length > 0) {
      lines.push(tableToMarkdown(section.tableData));
      lines.push("");
    }

    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(`*Dokumen ini dijana oleh UniDoc. Profil universiti: ${profile.fullName} (${profile.isVerified ? "Disahkan" : "Demonstrasi"}).*`);

  return lines.join("\n");
}
