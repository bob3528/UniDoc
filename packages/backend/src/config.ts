import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const projectRoot = resolve(backendRoot, "../..");
// Node 20.12+ loads .env without adding a dependency. Shell variables win.
for (const path of [resolve(backendRoot, ".env"), resolve(projectRoot, ".env")]) {
  if (existsSync(path)) process.loadEnvFile(path);
}
export const outputDirectory = resolve(process.env.OUTPUT_DIR || resolve(projectRoot, "output"));
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

/**
 * Fallback model used when the primary model returns 503/429 after all retries.
 * Defaults to gemini-2.0-flash — an older generation with more serving capacity,
 * still supports function calling, and is cost-efficient.
 */
export function getGeminiFallbackModel(): string {
  return process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.0-flash";
}

/** Base delay (ms) for exponential backoff when no Retry-After header is present. */
export function getGeminiBaseBackoffMs(): number {
  const v = Number(process.env.GEMINI_BASE_BACKOFF_MS);
  return v > 0 ? v : 1000;
}
