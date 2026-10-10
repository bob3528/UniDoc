# UniDoc

**One Prompt. Every University. One Perfect Proposal.**

AI-powered Malaysian university document automation platform with Google Gemini-powered agent workflow and MCP tool integration.

## Overview

UniDoc helps Malaysian university students and organisations prepare event proposals (kertas kerja) by:
- Generating complete structured proposals from natural-language event descriptions
- Applying university-specific formatting rules (UPM, UM, and more)
- Validating proposals against mandatory section and budget requirements
- Auto-repairing safe formatting and calculation errors
- Exporting to DOCX and Markdown formats

## Architecture

```
UniDoc/
├── packages/
│   ├── shared/          # Shared TypeScript types & Zod schemas
│   ├── mcp-server/      # MCP server with 15 tools + reusable services module
│   ├── backend/         # Express HTTP API + Gemini AI agent
│   └── frontend/        # React + Vite + Tailwind CSS web app
├── data/
│   └── universities/    # University template profiles (JSON)
├── tests/               # Automated test suite (30 tests)
├── DEVELOPMENT_EVIDENCE.md  # WorkBuddy usage documentation
├── .env.example         # Environment configuration template
├── vitest.config.ts
└── tsconfig.base.json
```

## Quick Start

### 1. Install & Build

```bash
npm install
npm run build:shared
npm run build:mcp
npm run build:backend
```

### 2. Configure Gemini (optional but recommended)

```bash
cp .env.example packages/backend/.env
# Edit packages/backend/.env and add your GEMINI_API_KEY
# Get a free key at https://aistudio.google.com/apikey
```

Without a Gemini API key, the deterministic document tools still work via the API — only the AI agent requires it.

### 3. Start the Application

**Terminal 1 — Backend:**
```bash
npm run start:backend
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```

Then open http://localhost:5173 in your browser.

### 4. Run Tests

```bash
npm test
```

## Using the Web Application

### AI Workspace
1. Navigate to **AI Workspace** from the sidebar
2. Type your event description, e.g.:
   > "Generate a UPM event proposal for a two-day AI workshop involving 100 students with a RM5,000 budget"
3. Click **Generate Proposal**
4. Watch the real-time execution trace as the AI agent:
   - Loads university template rules
   - Extracts event details from your prompt
   - Generates all mandatory sections
   - Validates the proposal
   - Repairs fixable issues
   - Exports the final DOCX
5. Download the document or preview it

### Custom Formatter
1. Navigate to **Custom Formatter**
2. Set font family, size, margins, spacing
3. Add, remove, or reorder sections
4. Mark mandatory sections
5. Save the template for reuse

### Document Preview & Validation
- View generated proposal sections with tables
- See validation issues with severity levels
- Review auto-repair actions applied
- Download the final DOCX

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/gemini/status` | Gemini AI availability |
| GET | `/api/universities` | List university profiles |
| GET | `/api/universities/:id` | Get university rules |
| POST | `/api/proposal/generate` | Generate proposal (direct) |
| POST | `/api/proposal/validate` | Validate proposal |
| POST | `/api/proposal/repair` | Auto-repair proposal |
| POST | `/api/budget/calculate` | Calculate budget totals |
| POST | `/api/budget/validate` | Validate budget |
| POST | `/api/export` | Export to DOCX/Markdown |
| GET | `/api/approval/:id` | Approval checklist |
| GET | `/api/templates` | List custom templates |
| POST | `/api/templates` | Create custom template |
| POST | `/api/agent` | Run AI agent (requires Gemini) |

## MCP Server (Standalone)

The MCP server can be used independently with WorkBuddy or any MCP-compatible client.

### Register with WorkBuddy

Add to `~/.workbuddy-ai/mcp.json`:

```json
{
  "mcpServers": {
    "unidoc": {
      "command": "node",
      "args": ["C:/Users/harre/UniDoc/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Then open WorkBuddy's connector management page and click "Trust" on the `unidoc` server.

### MCP Tools (15 total)

| Tool | Description |
|------|-------------|
| `list_universities` | List available university template profiles |
| `get_university_rules` | Get full formatting rules for a university |
| `generate_proposal` | Generate a complete structured proposal |
| `validate_proposal` | Validate against university requirements |
| `repair_proposal` | Auto-repair safe formatting/calculation errors |
| `calculate_budget` | Calculate budget totals and overruns |
| `validate_budget` | Validate budget for arithmetic errors |
| `suggest_budget_adjustments` | Suggest cost reductions |
| `export_document` | Export proposal as DOCX or Markdown |
| `get_approval_checklist` | Get university approval requirements |
| `create_custom_template` | Create reusable formatting template |
| `list_custom_templates` | List saved custom templates |
| `apply_custom_formatter` | Generate proposal with custom template |
| `validate_custom_format` | Validate against custom template |
| `convert_university_format` | Convert between university formats |

## University Templates

| University | Status |
|-----------|--------|
| UPM (Universiti Putra Malaysia) | Demo template |
| UM (Universiti Malaya) | Demo template |

Both templates are demonstration profiles. Verify formatting against official university guidelines before submission.

## Technology Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express 5, TypeScript
- **AI:** Google Gemini (REST API with function calling)
- **MCP:** @modelcontextprotocol/sdk (stdio transport)
- **Document:** docx library (DOCX generation), Markdown via string concat
- **Testing:** Vitest (30 tests)
- **Module:** ESNext with Bundler resolution

## License

MIT
