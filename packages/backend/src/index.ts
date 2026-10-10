import { createApp } from "./app.js";
import { getGeminiModel } from "./config.js";

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535");
const server = createApp().listen(port, () => {
  console.log(`[UniDoc] http://localhost:${port}`);
  console.log(`[UniDoc] Gemini: ${process.env.GEMINI_API_KEY ? getGeminiModel() : "not configured; direct endpoints still work"}`);
});
server.on("error", (err: NodeJS.ErrnoException) => {
  console.error(err.code === "EADDRINUSE" ? `Port ${port} is already in use. Stop the existing backend or change PORT in .env.` : err.message);
  process.exitCode = 1;
});
