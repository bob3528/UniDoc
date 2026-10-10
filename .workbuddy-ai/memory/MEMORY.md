# UniDoc Project Memory

## Project Overview
- **Name:** UniDoc — AI-powered Malaysian university event proposal automation
- **Hackathon:** Dormathon 2026, Track 2 (Agentic Solutions)
- **Team:** 3 UPM students, GitHub repo: github.com/bob3528/UniDoc
- **Budget:** 2,000 WorkBuddy credits — prioritise efficiency

## Architecture
- Monorepo: npm workspaces (packages/shared, packages/mcp-server, packages/backend, packages/frontend)
- TypeScript: ESNext module + Bundler resolution (changed from Node16 to fix docx lib import issues)
- MCP SDK: @modelcontextprotocol/sdk v1.0.4, stdio transport
- Document gen: docx v8.5.0 (Packer.toBuffer is async), Markdown via string concat
- Testing: vitest v2.1.9
- Data: JSON files in data/universities/ (upm.json, um.json)
- AI: Google Gemini REST API (no SDK — uses fetch directly, function calling)
- Backend: Express 5, port 3001
- Frontend: React 18 + Vite 5 + Tailwind CSS, port 5173 (proxy to backend)

## Completed (Phase 1 — Oct 10, 2026)
- Shared types & Zod schemas (all UniDoc entities)
- MCP server with 15 tools (universities, proposals, budget, export, formatter, conversion, approval)
- Deterministic engines: budget, proposal-builder, validator, repair, docx-generator, markdown-generator
- Custom template store (JSON-based)
- UPM + UM university profiles (demo, unverified)
- 30 tests passing (budget engine + tool handlers)
- WorkBuddy MCP config created at ~/.workbuddy-ai/mcp.json

## Completed (Phase 2 — Oct 10, 2026)
- Services barrel module (services.ts) in mcp-server for engine reuse
- Subpath exports added to mcp-server package.json (./services)
- Backend HTTP API (Express 5) with 14 REST endpoints
- Gemini REST API integration (function calling, bounded agent loop)
- Agent execution trace (max 10 iterations, 15 tool calls)
- React frontend with 5 pages (Dashboard, AI Workspace, Document Preview, Custom Formatter, Validation Report)
- API verified working: health, universities, budget, agent (graceful fallback)
- DEVELOPMENT_EVIDENCE.md documenting WorkBuddy usage
- .env.example for Gemini API key configuration

## Key Decisions
- Module resolution: ESNext/Bundler (Node16 failed with docx package's extensionless imports)
- Packer.toBuffer(doc) returns Promise<Buffer> — generateDocx is async
- University profiles loaded from JSON, cached in memory
- Missing event info marked with [PLACEHOLDER: description] tags
- Gemini via REST API (not SDK) — avoids npm install issues in sandbox
- Minimal Express type declarations — avoids @types/express dependency
- Services barrel module approach — avoids moving engine files to new package

## npm install issues
- Sandbox blocks npm install (SIGTERM on bulk delete of node_modules)
- Workaround: install individual packages, use existing packages, manual type declarations
- Missing: @types/express, @types/cors, tsx, @google/genai
- fdir manually copied from nested node_modules to root

## Remaining P0 Work
- Push to GitHub (blocked by sandbox — user needs to push manually)
- Test with actual GEMINI_API_KEY (user needs to provide key)
- End-to-end demo with real Gemini AI agent

## P1/P2 — NOT started (per user instruction: do not implement without confirmation)
- Business quotation mode, Additional validation, Deployment, Demo polishing
- DOCX template analysis, Multi-agent review, PDF processing, Advanced editor
