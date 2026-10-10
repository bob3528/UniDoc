// ============================================================
// MCP Tool Handler Tests
// ============================================================

import { describe, it, expect } from "vitest";
import { handleToolCall } from "../src/tools.js";
import { sampleEventDetails } from "./test-data.js";

describe("list_universities tool", () => {
  it("should return available university profiles", async () => {
    const result = await handleToolCall("list_universities", {});
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(1);

    const upm = data.universities.find((u: { id: string }) => u.id === "upm");
    expect(upm).toBeDefined();
    expect(upm.fullName).toContain("Putra");
  });
});

describe("get_university_rules tool", () => {
  it("should return full UPM profile", async () => {
    const result = await handleToolCall("get_university_rules", { universityId: "upm" });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.university.id).toBe("upm");
    expect(data.university.formatting.fontFamily).toBe("Times New Roman");
    expect(data.university.sections.length).toBeGreaterThan(5);
  });

  it("should return error for unknown university", async () => {
    const result = await handleToolCall("get_university_rules", { universityId: "nonexistent" });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(false);
    expect(data.error).toContain("not found");
  });
});

describe("calculate_budget tool", () => {
  it("should calculate budget totals", async () => {
    const result = await handleToolCall("calculate_budget", {
      budgetItems: sampleEventDetails.budget,
      budgetLimit: 5000,
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.summary.totalExpenditure).toBeGreaterThan(0);
    expect(data.summary.overrun).toBeGreaterThan(0);
  });
});

describe("validate_budget tool", () => {
  it("should validate budget and return issues", async () => {
    const result = await handleToolCall("validate_budget", {
      budgetItems: sampleEventDetails.budget,
      budgetLimit: 5000,
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.result.status).toBe("fail");
    const overrunIssue = data.result.issues.find(
      (i: { message: string }) => i.message.includes("overrun"),
    );
    expect(overrunIssue).toBeDefined();
  });
});

describe("generate_proposal tool", () => {
  it("should generate proposal with all sections", async () => {
    const result = await handleToolCall("generate_proposal", {
      eventDetails: sampleEventDetails,
      universityId: "upm",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.proposal.sections.length).toBeGreaterThan(8);

    // Check key sections exist
    const sectionIds = data.proposal.sections.map((s: { sectionId: string }) => s.sectionId);
    expect(sectionIds).toContain("introduction");
    expect(sectionIds).toContain("objectives");
    expect(sectionIds).toContain("financial_budget");
    expect(sectionIds).toContain("tentative_programme");
  });

  it("should include budget table in financial section", async () => {
    const result = await handleToolCall("generate_proposal", {
      eventDetails: sampleEventDetails,
      universityId: "upm",
    });
    const data = JSON.parse(result.content[0].text);

    const budgetSection = data.proposal.sections.find(
      (s: { sectionId: string }) => s.sectionId === "financial_budget",
    );
    expect(budgetSection.tableData).toBeDefined();
    expect(budgetSection.tableData.length).toBeGreaterThan(1); // header + data
  });

  it("should include tentative programme table", async () => {
    const result = await handleToolCall("generate_proposal", {
      eventDetails: sampleEventDetails,
      universityId: "upm",
    });
    const data = JSON.parse(result.content[0].text);

    const tentativeSection = data.proposal.sections.find(
      (s: { sectionId: string }) => s.sectionId === "tentative_programme",
    );
    expect(tentativeSection.tableData).toBeDefined();
    expect(tentativeSection.tableData.length).toBeGreaterThan(1);
  });
});

describe("validate_proposal tool", () => {
  it("should validate and detect budget overrun", async () => {
    const result = await handleToolCall("validate_proposal", {
      eventDetails: sampleEventDetails,
      universityId: "upm",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.report.status).toBe("fail"); // Budget overruns limit

    const budgetIssues = data.report.issues.filter(
      (i: { type: string }) => i.type === "budget_error",
    );
    expect(budgetIssues.length).toBeGreaterThan(0);
  });

  it("should pass validation for valid proposal without budget limit", async () => {
    const validDetails = {
      ...sampleEventDetails,
      budgetLimit: 10000, // high enough to avoid overrun
    };

    const result = await handleToolCall("validate_proposal", {
      eventDetails: validDetails,
      universityId: "upm",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    const errors = data.report.issues.filter((i: { severity: string }) => i.severity === "error");
    expect(errors.length).toBe(0);
  });
});

describe("repair_proposal tool", () => {
  it("should apply safe repairs and return remaining issues", async () => {
    // Create details with an issue (end date before start date)
    const brokenDetails = {
      ...sampleEventDetails,
      startDate: "2026-11-16",
      endDate: "2026-11-15", // End before start
    };

    // First validate to get issues
    const validationResult = await handleToolCall("validate_proposal", {
      eventDetails: brokenDetails,
      universityId: "upm",
    });
    const validationData = JSON.parse(validationResult.content[0].text);
    const issues = validationData.report.issues;

    // Then repair
    const repairResult = await handleToolCall("repair_proposal", {
      eventDetails: brokenDetails,
      universityId: "upm",
      validationIssues: issues,
    });
    const repairData = JSON.parse(repairResult.content[0].text);

    expect(repairData.success).toBe(true);
    expect(repairData.result.actions.length).toBeGreaterThan(0);

    // Check date was fixed
    const dateAction = repairData.result.actions.find(
      (a: { issueType: string }) => a.issueType === "date_error",
    );
    expect(dateAction).toBeDefined();
    expect(dateAction.applied).toBe(true);
  });
});

describe("export_document tool", () => {
  it("should export to markdown", async () => {
    const result = await handleToolCall("export_document", {
      eventDetails: sampleEventDetails,
      universityId: "upm",
      format: "markdown",
      outputPath: "test-output/test-proposal.md",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.format).toBe("markdown");
    expect(data.filePath).toBe("test-output/test-proposal.md");
  });

  it("should export to docx", async () => {
    const result = await handleToolCall("export_document", {
      eventDetails: sampleEventDetails,
      universityId: "upm",
      format: "docx",
      outputPath: "test-output/test-proposal.docx",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.format).toBe("docx");
    expect(data.filePath).toBe("test-output/test-proposal.docx");
  });
});

describe("get_approval_checklist tool", () => {
  it("should return approval checklist for UPM", async () => {
    const result = await handleToolCall("get_approval_checklist", {
      universityId: "upm",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.checklist.length).toBeGreaterThan(0);
    expect(data.checklist[0].stage).toBeDefined();
    expect(data.isVerified).toBe(false); // UPM is a demo template
  });
});

describe("create_custom_template tool", () => {
  it("should create and save a custom template", async () => {
    const result = await handleToolCall("create_custom_template", {
      name: "Test Template",
      description: "A test custom template",
      formatting: {
        fontFamily: "Calibri",
        bodyFontSize: 11,
        headingFontSize: 14,
        subHeadingFontSize: 12,
        lineSpacing: 1.15,
        paragraphSpacingBefore: 0,
        paragraphSpacingAfter: 8,
        margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
        pageSize: "A4",
        orientation: "portrait",
      },
      sections: [
        { id: "intro", name: "Introduction", mandatory: true, order: 0 },
        { id: "body", name: "Body", mandatory: true, order: 1 },
        { id: "conclusion", name: "Conclusion", mandatory: true, order: 2 },
      ],
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.template.id).toBeDefined();
    expect(data.template.name).toBe("Test Template");
    expect(data.template.sections).toHaveLength(3);
  });
});

describe("list_custom_templates tool", () => {
  it("should list all saved custom templates", async () => {
    const result = await handleToolCall("list_custom_templates", {});
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.count).toBeGreaterThanOrEqual(1); // Should have the test template from above
  });
});

describe("convert_university_format tool", () => {
  it("should convert from UPM to UM format", async () => {
    const result = await handleToolCall("convert_university_format", {
      eventDetails: sampleEventDetails,
      fromUniversityId: "upm",
      toUniversityId: "um",
    });
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(true);
    expect(data.convertedProposal.universityProfileId).toBe("um");
    // UM and UPM have the same section structure, so new sections may be 0
    expect(data.newSections).toBeDefined();
  });
});

describe("Error handling", () => {
  it("should return error for unknown tool", async () => {
    const result = await handleToolCall("nonexistent_tool", {});
    const data = JSON.parse(result.content[0].text);

    expect(data.success).toBe(false);
    expect(result.isError).toBe(true);
  });

  it("should handle missing required arguments gracefully", async () => {
    const result = await handleToolCall("get_university_rules", {});
    const data = JSON.parse(result.content[0].text);

    // Should not crash — the tool accesses undefined universityId
    // The university store will return null and we'll get an error
    expect(data.success).toBe(false);
  });
});
