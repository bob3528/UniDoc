#!/usr/bin/env node

// ============================================================
// UniDoc MCP Server — Entry Point
// ============================================================
// Starts the MCP server with stdio transport.
// Register it with WorkBuddy by adding to ~/.workbuddy-ai/mcp.json:
// {
//   "mcpServers": {
//     "unidoc": {
//       "command": "node",
//       "args": ["C:/Users/harre/UniDoc/packages/mcp-server/dist/index.js"]
//     }
//   }
// }
// ============================================================

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

async function main(): Promise<void> {
  const server = new Server(
    {
      name: "unidoc-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  registerTools(server);

  const transport = new StdioServerTransport();

  console.error("[UniDoc MCP] Starting server...");
  await server.connect(transport);
  console.error("[UniDoc MCP] Server running on stdio transport");
}

main().catch((err) => {
  console.error("[UniDoc MCP] Fatal error:", err);
  process.exit(1);
});
