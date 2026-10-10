// ============================================================
// UniDoc Backend — Express HTTP Server
// Serves API routes that reuse UniDoc document engines
// ============================================================

import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { mkdirSync } from "node:fs";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Ensure output directory exists
mkdirSync("output", { recursive: true });

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Register API routes
registerRoutes(app);

app.listen(PORT, () => {
  console.log(`[UniDoc Backend] Server running on http://localhost:${PORT}`);
  console.log(`[UniDoc Backend] Gemini AI: ${process.env.GEMINI_API_KEY ? "configured" : "not configured (set GEMINI_API_KEY in .env)"}`);
  console.log(`[UniDoc Backend] API docs: http://localhost:${PORT}/api/health`);
});
