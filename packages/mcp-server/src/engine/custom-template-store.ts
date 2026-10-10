// ============================================================
// Custom Template Store — Lightweight JSON-based storage
// ============================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { CustomTemplate, UniversityFormatting, SectionDefinition } from "@unidoc/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Store: project_root/data/custom-templates.json
const STORE_PATH = join(__dirname, "..", "..", "..", "..", "data", "custom-templates.json");

function ensureStore(): void {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, "[]", "utf-8");
  }
}

function readAll(): CustomTemplate[] {
  ensureStore();
  const raw = readFileSync(STORE_PATH, "utf-8");
  try {
    return JSON.parse(raw) as CustomTemplate[];
  } catch {
    return [];
  }
}

function writeAll(templates: CustomTemplate[]): void {
  ensureStore();
  writeFileSync(STORE_PATH, JSON.stringify(templates, null, 2), "utf-8");
}

export function createCustomTemplate(params: {
  name: string;
  description?: string;
  formatting: UniversityFormatting;
  sections: SectionDefinition[];
}): CustomTemplate {
  const now = new Date().toISOString();
  const template: CustomTemplate = {
    id: randomUUID(),
    name: params.name,
    description: params.description,
    formatting: params.formatting,
    sections: params.sections,
    createdAt: now,
    updatedAt: now,
  };

  const templates = readAll();
  templates.push(template);
  writeAll(templates);
  return template;
}

export function listCustomTemplates(): CustomTemplate[] {
  return readAll();
}

export function getCustomTemplate(id: string): CustomTemplate | null {
  return readAll().find((t) => t.id === id) || null;
}

export function updateCustomTemplate(
  id: string,
  updates: Partial<Pick<CustomTemplate, "name" | "description" | "formatting" | "sections">>,
): CustomTemplate | null {
  const templates = readAll();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  templates[idx] = {
    ...templates[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeAll(templates);
  return templates[idx];
}

export function deleteCustomTemplate(id: string): boolean {
  const templates = readAll();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  writeAll(filtered);
  return true;
}
