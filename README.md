# UniDoc

**One Prompt. Every University. One Perfect Proposal.**

AI-powered Malaysian university document automation platform that generates, validates, and exports event proposals (kertas kerja) through WorkBuddy MCP integration.

## Overview

UniDoc helps Malaysian university students and organisations prepare event proposals by:
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
│   ├── mcp-server/      # MCP server with UniDoc tools
│   └── frontend/        # React + Vite + Tailwind UI (coming soon)
├── data/
│   └── universities/    # University template profiles (JSON)
├── tests/               # Automated test suite
├── vitest.config.ts
└── tsconfig.base.json
```

### MCP Tools

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

## Quick Start

### Install

```bash
npm install
```

### Build

```bash
npm run build:shared
npm run build:mcp
```

### Test

```bash
npm test
```

### Run MCP Server

```bash
npm run start --workspace @unidoc/mcp-server
```

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

Then open WorkBuddy's connector management page and click "Trust" on the new `unidoc` server.

## Example Usage

Ask WorkBuddy:

> "Generate a UPM event proposal for a two-day AI workshop involving 100 participants with a RM5,000 budget."

UniDoc will autonomously:
1. Load UPM template rules
2. Generate all mandatory sections
3. Calculate the budget
4. Validate the proposal
5. Auto-repair fixable issues
6. Export the final document

## University Templates

| University | Status |
|-----------|--------|
| UPM (Universiti Putra Malaysia) | Demo template |
| UM (Universiti Malaya) | Demo template |

Both templates are demonstration profiles. Verify formatting against official university guidelines before submission.

## License

MIT
