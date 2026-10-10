import "./config.js";
import express, { type Application } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";

export function createApp(): Application {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));
  registerRoutes(app);
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    res.status(status).json({ success: false, error: status === 400 ? "Invalid JSON body" :
      status === 413 ? "Request body too large" : "Internal server error" });
  });
  return app;
}
