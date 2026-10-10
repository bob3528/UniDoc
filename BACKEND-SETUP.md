# UniDoc backend fixes

This is a corrected source snapshot of bob3528/UniDoc at commit
7d8d82f266ac5dc52d2e3b17df9693770789ca61. GitHub has not been changed.
The website API reuses the existing document engines; starting an MCP server is unnecessary.

## Start on Windows (PowerShell)

Extract UniDoc-fixed.zip to a new folder. Keep your original project as a backup.
Use Node.js 20.12 or newer (Node.js 22 or 24 is suitable).
In the extracted UniDoc-fixed folder:

```powershell
npm ci
npm run build
Copy-Item packages/backend/.env.example packages/backend/.env
notepad packages/backend/.env
```

Fill in GEMINI_API_KEY for natural-language generation. The default model is
`gemini-2.5-flash`; you can change GEMINI_MODEL to a model available to your account.
Do not commit or share your key. A configured key is not proof that the provider accepts it.

Start the backend:

```powershell
npm run dev:backend
```

In a second terminal in the same folder:

```powershell
npm run dev:frontend
```

Open http://localhost:5173. The frontend proxies /api to port 3001.
For compiled backend operation, use `npm run start:backend` after `npm run build`.
Use separate terminals on Windows; the original root `npm run dev` uses Unix shell syntax.

## Verify the core flow without spending API credits

With the backend running, in another PowerShell terminal:

```powershell
./examples/backend-smoke.ps1
```

This generates and validates a sample proposal, calculates the budget, exports DOCX,
and downloads the DOCX into your current folder. It never invokes Gemini.
It deliberately uses RM5,000 against RM7,900 expenditure to demonstrate an overrun.
The sample is fictional test data.

Automated checks:

```powershell
npm run build
npm test
npm run build:frontend
```

## Existing API contracts

| Endpoint | Purpose |
| --- | --- |
| GET /api/health | Backend reachability |
| GET /api/gemini/status | Key presence and configured model (does not verify credentials) |
| GET /api/universities | University template summaries |
| GET /api/universities/:id | Rules, formatting, mandatory sections |
| POST /api/proposal/generate | Build draft sections from structured event details |
| POST /api/proposal/validate | Identify missing information, placeholders, date and budget issues |
| POST /api/proposal/repair | Apply deterministic repairs, return updated eventDetails and repairedSections |
| POST /api/budget/calculate | Calculate quantity × unit price, totals, remaining budget/overrun |
| POST /api/budget/validate | Detect incorrect supplied totals, duplicates, and overruns |
| POST /api/export | Generate DOCX or Markdown; return filePath, filename, downloadUrl |
| GET /api/download/:filename | Download generated file |
| GET /api/approval/:universityId | Approval checklist and template verification flag |
| GET /api/templates | List saved custom templates |
| POST /api/templates | Validate and save a custom template definition |
| GET /api/templates/:id | Retrieve saved custom template |
| POST /api/agent | Gemini-assisted proposal workflow with an execution trace |

Proposal requests use `{ eventDetails, universityId }`; their university IDs must match.
Dates must be valid YYYY-MM-DD dates. Exports additionally require `format: "docx"`
or `format: "markdown"`. Server export destinations are generated internally; the HTTP
API and Gemini export tool no longer accept outputPath. Bad request bodies return HTTP
400 with machine-readable validation issues. Unknown universities return HTTP 404.

## What changed

- Loads packages/backend/.env and root .env from stable paths; existing environment variables win.
- Uses a single configurable Gemini model, defaulting to gemini-2.5-flash.
- Removes incompatible Gemini schema fields; describes nested objects and array items.
- Preserves Gemini model response parts (including thought signatures) between turns.
- Groups all function responses from one model turn into a single response turn.
- Validates Gemini tool arguments and website request bodies before executing engines.
- Adds a 30-second timeout per Gemini request; keeps bounded agent iterations/tool calls.
- Reports failure when the agent finishes without exporting a document.
- Generates DOCX/Markdown into a stable output directory and fixes ES-module downloads.
- Uses random filenames; rejects arbitrary export destinations and invalid download filenames.
- Revalidates freshly rebuilt sections after repair and returns repaired event details.
- Repairs the dependency lockfile and declares the tsx development runner.
- Adds HTTP integration and Gemini/agent regression tests.

## Practical limits

Live Gemini responses and quota availability need testing with your own key. Local tests
mock provider responses and do not spend credits. Existing university profiles are only
as reliable as their supplied rules and isVerified flags; the code does not independently
certify official university compliance. DOCX and Markdown are supported; PDF is rejected
rather than silently returning DOCX. Drafts are returned to the browser, not persisted as
user accounts/history. Custom templates are stored, but the website generation endpoint
uses university profiles; applying custom templates is a separate existing engine/MCP
capability. This is a local hackathon backend with no authentication or document access
control; deployment for multiple users requires those features.

If port 3001 is already occupied, stop the previous backend. Changing PORT also requires
changing the frontend proxy target in packages/frontend/vite.config.ts.
