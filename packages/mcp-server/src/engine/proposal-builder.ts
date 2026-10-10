// ============================================================
// Proposal Builder — Generates structured proposal sections
// from event details and university template.
// ============================================================

import type { EventDetails, ProposalSection, UniversityProfile } from "@unidoc/shared";
import { calculateBudget } from "./budget-engine.js";

/**
 * Format a date string for display.
 * Handles ISO dates and dd/mm/yyyy formats.
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return "[TBA]";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch {
    // fall through
  }
  return dateStr;
}

/**
 * Format currency in RM.
 */
function formatRM(amount: number): string {
  return `RM${amount.toFixed(2)}`;
}

/**
 * Build a budget table as string[][] for section.tableData.
 */
function buildBudgetTable(eventDetails: EventDetails): string[][] {
  const summary = calculateBudget(eventDetails.budget, eventDetails.budgetLimit);
  const rows: string[][] = [];

  // Header row
  rows.push(["Bil.", "Kategori", "Penerangan", "Kuantiti", "Harga Seunit", "Jumlah (RM)"]);

  // Data rows
  summary.items.forEach((item, index) => {
    rows.push([
      String(index + 1),
      item.category,
      item.description,
      String(item.quantity),
      formatRM(item.unitPrice),
      formatRM(item.total),
    ]);
  });

  // Total row
  rows.push(["", "", "", "", "Jumlah Keseluruhan", formatRM(summary.totalExpenditure)]);

  return rows;
}

/**
 * Build a tentative programme table from activities.
 */
function buildTentativeTable(eventDetails: EventDetails): string[][] {
  const rows: string[][] = [];
  rows.push(["Masa", "Aktiviti", "Fasilitator"]);

  eventDetails.activities.forEach((activity) => {
    rows.push([
      activity.time,
      activity.description,
      activity.facilitator || "-",
    ]);
  });

  return rows;
}

/**
 * Build a committee table.
 */
function buildCommitteeTable(eventDetails: EventDetails): string[][] {
  const rows: string[][] = [];
  rows.push(["Jawatan", "Nama", "No. Matrik", "Fakulti"]);

  eventDetails.committee.forEach((member) => {
    rows.push([
      member.position,
      member.name,
      member.studentId || "-",
      member.faculty || "-",
    ]);
  });

  return rows;
}

/**
 * Generate the full set of proposal sections based on event details and university template.
 * Each section is generated with content appropriate to the event.
 * Missing information is marked with [PLACEHOLDER: description] for easy identification.
 */
export function buildProposalSections(
  eventDetails: EventDetails,
  profile: UniversityProfile,
): ProposalSection[] {
  const sections: ProposalSection[] = [];

  for (const sectionDef of profile.sections) {
    const section = buildSection(sectionDef.id, eventDetails, profile);
    if (section) {
      sections.push(section);
    }
  }

  return sections;
}

function buildSection(
  sectionId: string,
  details: EventDetails,
  profile: UniversityProfile,
): ProposalSection | null {
  switch (sectionId) {
    case "cover_page":
      return {
        sectionId: "cover_page",
        title: profile.sections.find((s) => s.id === "cover_page")?.name || "Cover Page",
        content: [
          `${profile.fullName} (${profile.name})`,
          "",
          details.title,
          "",
          `Dianjur oleh: ${details.organiser}`,
          `Tarikh: ${formatDate(details.startDate)} - ${formatDate(details.endDate)}`,
          `Tempat: ${details.venue}`,
        ].join("\n"),
      };

    case "introduction":
      return {
        sectionId: "introduction",
        title: profile.sections.find((s) => s.id === "introduction")?.name || "Introduction",
        content: details.introduction ||
          `[PLACEHOLDER: Introduction — Provide a brief introduction explaining the rationale and context for the "${details.title}" programme. Explain why this programme is being organised and what problem or need it addresses.]`,
      };

    case "background":
      return {
        sectionId: "background",
        title: profile.sections.find((s) => s.id === "background")?.name || "Background",
        content: details.background ||
          `[PLACEHOLDER: Background — Provide background information about ${details.organiser} and the context leading to the organisation of this programme.]`,
      };

    case "objectives":
      return {
        sectionId: "objectives",
        title: profile.sections.find((s) => s.id === "objectives")?.name || "Objectives",
        content: details.objectives.length > 0
          ? details.objectives.map((obj, i) => `${i + 1}. ${obj}`).join("\n")
          : "[PLACEHOLDER: Objectives — List at least 3 programme objectives.]",
      };

    case "programme_details":
      return {
        sectionId: "programme_details",
        title: profile.sections.find((s) => s.id === "programme_details")?.name || "Programme Details",
        content: [
          `**Tajuk Program:** ${details.title}`,
          `**Tarikh:** ${formatDate(details.startDate)} hingga ${formatDate(details.endDate)}`,
          `**Tempat:** ${details.venue}`,
          `**Penganjur:** ${details.organiser}`,
          `**Bilangan Peserta Sasaran:** ${details.targetParticipants} orang`,
        ].join("\n"),
      };

    case "target_participants":
      return {
        sectionId: "target_participants",
        title: profile.sections.find((s) => s.id === "target_participants")?.name || "Target Participants",
        content: `Program ini ditujukan kepada ${details.targetParticipants} peserta sasaran. [PLACEHOLDER: Specify the specific target groups — e.g. "Pelajar sarjana muda Fakulti Kejuruteraan tahun 2 dan 3" or "Semua ahli Kelab AI UPM"]`,
      };

    case "organising_committee":
      return {
        sectionId: "organising_committee",
        title: profile.sections.find((s) => s.id === "organising_committee")?.name || "Organising Committee",
        content: details.committee.length > 0
          ? "Jawatankuasa penganjur adalah seperti berikut:"
          : "[PLACEHOLDER: List at least the key committee members (Pengerusi, Timbalan Pengerusi, Setiausaha, Bendahari).]",
        tableData: details.committee.length > 0 ? buildCommitteeTable(details) : undefined,
      };

    case "tentative_programme":
      return {
        sectionId: "tentative_programme",
        title: profile.sections.find((s) => s.id === "tentative_programme")?.name || "Tentative Programme",
        content: details.activities.length > 0
          ? "Tentatif program adalah seperti berikut:"
          : "[PLACEHOLDER: Provide a detailed programme itinerary with time slots and activities.]",
        tableData: details.activities.length > 0 ? buildTentativeTable(details) : undefined,
      };

    case "financial_budget":
      return {
        sectionId: "financial_budget",
        title: profile.sections.find((s) => s.id === "financial_budget")?.name || "Financial Budget",
        content: details.budget.length > 0
          ? "Belanjawan kewangan bagi program ini adalah seperti berikut:"
          : "[PLACEHOLDER: Provide itemised budget with categories, quantities, and unit prices.]",
        tableData: details.budget.length > 0 ? buildBudgetTable(details) : undefined,
      };

    case "expected_outcomes":
      return {
        sectionId: "expected_outcomes",
        title: profile.sections.find((s) => s.id === "expected_outcomes")?.name || "Expected Outcomes",
        content: details.expectedOutcomes.length > 0
          ? details.expectedOutcomes.map((outcome, i) => `${i + 1}. ${outcome}`).join("\n")
          : "[PLACEHOLDER: List expected outcomes and benefits of the programme.]",
      };

    case "conclusion":
      return {
        sectionId: "conclusion",
        title: profile.sections.find((s) => s.id === "conclusion")?.name || "Conclusion",
        content: details.conclusion ||
          `Sepertimana yang telah dihuraikan, program "${details.title}" diharap dapat memberi manfaat kepada semua peserta. Sehubungan itu, pihak penganjur memohon kelulusan dan sokongan untuk menjayakan program ini. Segala kerjasama dan bimbingan daripada pihak universiti amat dihargai.`,
      };

    case "appendices":
      return {
        sectionId: "appendices",
        title: profile.sections.find((s) => s.id === "appendices")?.name || "Appendices",
        content: profile.supportingDocuments.length > 0
          ? `Dokumen-dokumen sokongan berikut disertakan bersama cadangan ini:\n` +
            profile.supportingDocuments.map((doc, i) => `Lampiran ${String.fromCharCode(65 + i)}: ${doc}`).join("\n")
          : "[PLACEHOLDER: List supporting documents and appendices.]",
      };

    default:
      return {
        sectionId,
        title: profile.sections.find((s) => s.id === sectionId)?.name || sectionId,
        content: `[PLACEHOLDER: Content for "${sectionId}" section.]`,
      };
  }
}
