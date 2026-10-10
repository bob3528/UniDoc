import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { createApp } from "../src/app.js";
import { outputDirectory } from "../src/config.js";
import { sampleEventDetails } from "../../mcp-server/tests/test-data.js";

let server: Server;
let base: string;
const files: string[] = [];
beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});
afterAll(async () => {
  await Promise.all(files.map(file => unlink(join(outputDirectory, file))));
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
});
const post = (path: string, body: unknown) => fetch(`${base}/api${path}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const request = { eventDetails: sampleEventDetails, universityId: "upm" };

describe("Website backend", () => {
  it("loads university profiles and generates required sections without an API key", async () => {
    const universities = await (await fetch(`${base}/api/universities`)).json();
    expect(universities.universities.some((u: any) => u.id === "upm")).toBe(true);
    const response = await post("/proposal/generate", request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposal.sections.length).toBeGreaterThan(5);
    expect(body.proposal.eventDetails.title).toBe(sampleEventDetails.title);
  });
  it("returns 400 for missing fields, impossible dates, and mismatched universities", async () => {
    for (const body of [{}, { ...request, eventDetails: { ...sampleEventDetails, startDate: "2026-02-30" } },
      { ...request, universityId: "um" }]) {
      expect((await post("/proposal/generate", body)).status).toBe(400);
    }
  });
  it("returns 404 for an unknown university", async () => {
    const response = await post("/proposal/generate", { universityId: "missing", eventDetails: { ...sampleEventDetails, university: "missing" } });
    expect(response.status).toBe(404);
  });
  it("rejects malformed JSON with a JSON error", async () => {
    const response = await fetch(`${base}/api/proposal/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    expect(response.status).toBe(400);
    expect((await response.json()).success).toBe(false);
  });
  it("calculates cents and reports overruns", async () => {
    const body = await (await post("/budget/calculate", { budgetItems: [{ category: "Food", description: "Lunch", quantity: 3, unitPrice: 0.1 }], budgetLimit: 0.2 })).json();
    expect(body.summary.totalExpenditure).toBe(0.3);
    expect(body.summary.overrun).toBe(0.1);
    expect((await post("/budget/calculate", { budgetItems: [{ category: "Food", description: "Lunch", quantity: -1, unitPrice: 5 }] })).status).toBe(400);
  });
  it("detects incorrect submitted budget totals", async () => {
    const response = await post("/budget/validate", { budgetItems: [{ category: "Food", description: "Lunch", quantity: 2, unitPrice: 5, total: 2 }] });
    const body = await response.json();
    expect(body.result.status).toBe("fail");
    expect(body.result.issues[0].message).toContain("should be RM10.00");
  });
  it("returns repaired details and freshly validates repaired sections", async () => {
    const reversed = { ...sampleEventDetails, startDate: "2026-11-16", endDate: "2026-11-15" };
    const report = (await (await post("/proposal/validate", { ...request, eventDetails: reversed })).json()).report;
    expect(report.issues.some((i: any) => i.type === "date_error")).toBe(true);
    const body = await (await post("/proposal/repair", { ...request, eventDetails: reversed, validationIssues: report.issues })).json();
    expect(body.eventDetails.startDate).toBe("2026-11-15");
    expect(body.result.remainingIssues.some((i: any) => i.type === "date_error")).toBe(false);
    expect(body.result.remainingIssues.some((i: any) => i.type === "budget_error")).toBe(true);
  });
  it.each(["docx", "markdown"])("exports and downloads real %s bytes", async format => {
    const response = await post("/export", { ...request, format });
    expect(response.status).toBe(200);
    const body = await response.json();
    files.push(body.filename);
    const download = await fetch(`${base}${body.downloadUrl}`);
    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("attachment");
    const bytes = Buffer.from(await download.arrayBuffer());
    expect(format === "docx" ? bytes.subarray(0, 2).toString() : bytes.toString()).toContain(format === "docx" ? "PK" : sampleEventDetails.title);
  });
  it("rejects arbitrary output paths and unsupported formats", async () => {
    expect((await post("/export", { ...request, format: "pdf" })).status).toBe(400);
    expect((await post("/export", { ...request, format: "docx", outputPath: "../package.json" })).status).toBe(400);
    expect((await fetch(`${base}/api/download/not-a-file.docx`)).status).toBe(404);
    expect((await fetch(`${base}/api/download/package.json`)).status).toBe(400);
  });
  it("validates custom templates and whitespace prompts", async () => {
    expect((await post("/templates", { name: "Bad" })).status).toBe(400);
    expect((await post("/agent", { prompt: "  " })).status).toBe(400);
  });
});
