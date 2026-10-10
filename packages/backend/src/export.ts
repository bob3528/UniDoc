import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { EventDetails, UniversityProfile } from "@unidoc/shared";
import { buildProposalSections, generateMarkdown, generateDocx } from "@unidoc/mcp-server/services";
import { outputDirectory } from "./config.js";

export async function exportDocument(eventDetails: EventDetails, profile: UniversityProfile, format: "docx" | "markdown") {
  await mkdir(outputDirectory, { recursive: true });
  const filename = `${randomUUID()}.${format === "markdown" ? "md" : "docx"}`;
  const destination = join(outputDirectory, filename);
  const sections = buildProposalSections(eventDetails, profile);
  let content: string | undefined;
  if (format === "markdown") {
    content = generateMarkdown(sections, profile, eventDetails);
    await writeFile(destination, content, "utf8");
  } else {
    await generateDocx(sections, profile, eventDetails, destination);
  }
  return { success: true, format, filePath: `output/${filename}`, filename,
    downloadUrl: `/api/download/${filename}`, ...(content === undefined ? {} : { content }) };
}
