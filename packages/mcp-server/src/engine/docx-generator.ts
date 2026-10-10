// ============================================================
// DOCX Generator — Exports proposal as Word document
// ============================================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageOrientation,
  convertMillimetersToTwip,
} from "docx";
import { writeFileSync } from "node:fs";
import type { ProposalSection, UniversityProfile, EventDetails } from "@unidoc/shared";

/**
 * Build a docx Table from string[][] data.
 */
function buildTable(rows: string[][]): Table {
  const tableRows = rows.map(
    (row, rowIndex) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, bold: rowIndex === 0 })],
                }),
              ],
            }),
        ),
      }),
  );

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Build a paragraph from content text, handling simple markdown-like syntax.
 */
function buildParagraph(text: string, formatting: UniversityProfile["formatting"]): Paragraph {
  // Detect heading-like lines (e.g., "**Title:** value")
  const boldMatch = text.match(/\*\*(.+?)\*\*/g);

  if (boldMatch) {
    // Split by bold markers and build runs
    const parts: TextRun[] = [];
    let remaining = text;
    for (const match of boldMatch) {
      const idx = remaining.indexOf(match);
      if (idx > 0) {
        parts.push(new TextRun({ text: remaining.slice(0, idx) }));
      }
      parts.push(new TextRun({ text: match.replace(/\*\*/g, ""), bold: true }));
      remaining = remaining.slice(idx + match.length);
    }
    if (remaining) {
      parts.push(new TextRun({ text: remaining }));
    }
    return new Paragraph({ children: parts });
  }

  return new Paragraph({
    children: [new TextRun({ text })],
  });
}

/**
 * Generate a DOCX document and save to file.
 */
export async function generateDocx(
  sections: ProposalSection[],
  profile: UniversityProfile,
  eventDetails: EventDetails,
  outputPath: string,
): Promise<void> {
  const fmt = profile.formatting;
  const marginTwips = {
    top: convertMillimetersToTwip(fmt.margins.top),
    right: convertMillimetersToTwip(fmt.margins.right),
    bottom: convertMillimetersToTwip(fmt.margins.bottom),
    left: convertMillimetersToTwip(fmt.margins.left),
  };

  // Build document children (paragraphs and tables)
  const children: (Paragraph | Table)[] = [];

  // Cover page
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: profile.fullName, bold: true, size: fmt.headingFontSize * 2 }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: eventDetails.title, bold: true, size: fmt.headingFontSize * 2 }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: `Dianjur oleh: ${eventDetails.organiser}`,
          size: fmt.bodyFontSize * 2,
        }),
      ],
    }),
  );
  children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

  // Build each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionNum = i + 1;

    // Section heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `${sectionNum}. ${section.title}`,
            bold: true,
            size: fmt.headingFontSize * 2,
          }),
        ],
      }),
    );

    // Content
    if (section.content) {
      const contentLines = section.content.split("\n");
      for (const line of contentLines) {
        if (line.trim()) {
          children.push(buildParagraph(line, fmt));
        }
      }
    }

    // Table
    if (section.tableData && section.tableData.length > 0) {
      children.push(buildTable(section.tableData));
    }
  }

  // Footer
  children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Dokumen ini dijana oleh UniDoc. Profil: ${profile.fullName} (${profile.isVerified ? "Disahkan" : "Demonstrasi"}).`,
          italics: true,
          size: fmt.bodyFontSize * 2,
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: fmt.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: marginTwips,
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
}
