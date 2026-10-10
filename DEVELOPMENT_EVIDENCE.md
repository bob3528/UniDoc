# Development Evidence — WorkBuddy Usage

## Overview

UniDoc was developed using WorkBuddy AI as the primary development platform during the Dormathon 2026 hackathon (Track 2: Agentic Solutions).

## Phase 1: Architecture & MCP Server

### WorkBuddy Contributions

1. **Project Architecture Design**
   - Designed the npm workspace monorepo structure (shared, mcp-server, backend, frontend packages)
   - Defined shared TypeScript types and Zod schemas for all UniDoc entities
   - Chose ESNext/Bundler module resolution after Node16 failed with the `docx` library's type declarations

2. **MCP Server Implementation**
   - Implemented 15 MCP tools with full input schemas and handlers:
     - University tools: list_universities, get_university_rules
     - Proposal tools: generate_proposal, validate_proposal, repair_proposal
     - Budget tools: calculate_budget, validate_budget, suggest_budget_adjustments
     - Export tools: export_document (DOCX + Markdown)
     - Approval tools: get_approval_checklist
     - Custom formatter tools: create_custom_template, list_custom_templates, apply_custom_formatter, validate_custom_format
     - Conversion tools: convert_university_format
   - Built 7 deterministic engine modules: university-store, budget-engine, proposal-builder, validator, repair-engine, docx-generator, markdown-generator, custom-template-store

3. **University Template Data**
   - Created UPM and UM demonstration university profiles with:
     - Formatting rules (fonts, margins, spacing)
     - Mandatory sections with ordering
     - Supporting documents list
     - Approval flow stages

4. **Testing**
   - Wrote 30 automated tests (11 budget engine + 19 tool handler tests)
   - All tests pass with vitest

5. **Debugging**
   - Fixed `docx` library import issue (Node16 → Bundler resolution)
   - Fixed `Packer.toBuffer()` async return type
   - Fixed npm optional dependency issues (@rollup/rollup-win32-x64-msvc, @esbuild/win32-x64)

## Phase 2: Frontend & Backend

### WorkBuddy Contributions

1. **Backend HTTP API**
   - Created Express-based HTTP API (`packages/backend`)
   - Designed RESTful routes that reuse the same engine functions as the MCP server
   - Implemented services barrel module to share engines between MCP and HTTP API
   - Integrated Google Gemini REST API for function calling (no SDK dependency — uses fetch)

2. **Gemini AI Agent**
   - Implemented bounded agent execution loop (max 10 iterations, max 15 tool calls)
   - Defined 10 Gemini function declarations mapping to UniDoc engine tools
   - Created system instruction for proposal generation workflow
   - Implemented execution trace with step-by-step progress
   - Added safe fallback when API key is not configured

3. **React Frontend**
   - Set up Vite + React + TypeScript + Tailwind CSS
   - Built 5 pages: Dashboard, AI Workspace, Document Preview, Custom Formatter, Validation Report
   - Implemented sidebar navigation with page state management
   - Created API client module for backend communication
   - Designed clean, modern SaaS interface with green accent

4. **Bug Fixes**
   - Fixed Express type declarations for TypeScript
   - Fixed `unknown` type in JSX expressions
   - Resolved Vite `fdir` missing dependency

## Relevant Prompts Used

1. "Start with project architecture, shared interfaces and a minimal working MCP server." — Initiated Phase 1 development
2. Phase 2 master development prompt — Directed full-stack development with Gemini integration
3. Various debugging prompts for TypeScript compilation errors and npm dependency issues

## Modified Files

### Phase 1 (30 files created)
- Root: package.json, tsconfig.base.json, vitest.config.ts, README.md
- packages/shared: types.ts, schemas.ts, index.ts, package.json, tsconfig.json
- packages/mcp-server: index.ts, tools.ts, 7 engine files, package.json, tsconfig.json
- data/universities: upm.json, um.json
- packages/mcp-server/tests: test-data.ts, budget.test.ts, tools.test.ts

### Phase 2 (17 files created)
- packages/backend: index.ts, routes.ts, types/express.d.ts, gemini/client.ts, gemini/tools.ts, gemini/agent.ts, package.json, tsconfig.json, .env.example
- packages/frontend: App.tsx, main.tsx, index.css, api.ts, index.html, 5 page components, vite.config.ts, tailwind.config.js, postcss.config.js, package.json, tsconfig.json
- packages/mcp-server: services.ts (new), package.json (updated exports)
- Root: package.json (updated scripts/workspaces), .env.example, DEVELOPMENT_EVIDENCE.md

## Test Results

- Phase 1: 30/30 tests pass (11 budget engine + 19 tool handler)
- Backend API: health, universities, budget, gemini/status endpoints verified working
- Agent endpoint: correctly handles missing GEMINI_API_KEY with clear error message
- Frontend: Vite dev server serving React app successfully

## Where WorkBuddy Was NOT Used

- University template data: UPM and UM profiles are demonstration templates based on common kertas kerja conventions, not generated from official university guidelines
- Gemini API key: Not provided during development; AI agent endpoint tested with graceful fallback
- Deployment: Not yet deployed — local testing only
