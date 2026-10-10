// ============================================================
// University Store — Loads university profiles from JSON files
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { UniversityProfile } from "@unidoc/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Data directory: project_root/data/universities/
// This file is at packages/mcp-server/src/engine/university-store.ts
// So data is at ../../../../data/universities/
const DATA_DIR = join(__dirname, "..", "..", "..", "..", "data", "universities");

const profileCache = new Map<string, UniversityProfile>();

function loadProfile(id: string): UniversityProfile | null {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  if (profileCache.has(id)) {
    return profileCache.get(id)!;
  }

  try {
    const filePath = join(DATA_DIR, `${id}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const profile = JSON.parse(raw) as UniversityProfile;
    profileCache.set(id, profile);
    return profile;
  } catch {
    return null;
  }
}

export function listUniversities(): UniversityProfile[] {
  try {
    const files = readdirSync(DATA_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .map((id) => loadProfile(id))
      .filter((p): p is UniversityProfile => p !== null);
  } catch {
    return [];
  }
}

export function getUniversity(id: string): UniversityProfile | null {
  return loadProfile(id);
}

export function getUniversitySummary(id: string): {
  id: string;
  name: string;
  fullName: string;
  isVerified: boolean;
  sectionCount: number;
} | null {
  const profile = loadProfile(id);
  if (!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    fullName: profile.fullName,
    isVerified: profile.isVerified,
    sectionCount: profile.sections.length,
  };
}
