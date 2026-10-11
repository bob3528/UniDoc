# paperIN

**Your ideas. Properly on paper.**

A free standalone local application for Malaysian university proposals and business documents. React, TypeScript, Vite, Express, Zod, deterministic financial calculations, persistent document versions and real DOCX export. There are no subscriptions, checkout flows, paid templates, credits or feature locks. Google’s Gemini account quota and provider charges still apply.

## Run the application

Install Node.js 22 LTS or newer (minimum Node 20.12). Extract into a fresh folder and open a terminal in `paperIN`, beside `package.json`.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Keep the terminal running; Ctrl+C stops it. Windows users can run `start-paperIN.cmd` after installing Node. That launcher is prepared but has not been executed on Windows in this environment.

A blank `.env` and `.env.example` are included. Edit the root `.env`:

```dotenv
PORT=3001
HOST=127.0.0.1
DATA_DIR=./data
GEMINI_API_KEY=your_actual_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Set `GEMINI_MODEL` to a model available for your own key. Restart after editing `.env`. In **Settings**, select **Test Gemini model availability** to query the configured model’s supported generation methods. There is no automatic fallback to an unverified model. The configured example is not a guarantee of model availability for your account.

Keys stay on the backend, in the API-key header, and never enter the browser bundle. Never enter a key into a prompt or share your populated `.env`. Without a key, manual editing, saving, validation and export remain available; Gemini controls display an actionable error.

If port 3001 is occupied, stop the previous paperIN server or change `PORT` in `.env`. Do not terminate unrelated programs. For development, use `npm run dev` and open http://127.0.0.1:5173. The launcher starts both services; the Vite proxy follows the root backend port.

## One prompt to document

1. Select **University** or **Business**, then **Create document** for a template.
2. Describe the document in the prompt panel. Example: “Organise a blood donation campaign at UPM for 100 students with a RM2,000 estimated budget. Draft the proposal, suggest estimated expenses and ask for missing facts.”
3. Select **Update document with AI**. Gemini returns a schema-shaped patch; the backend validates its types, choices, dates and numeric bounds with Zod.
4. Matching text fields, attendance and supported table entries populate automatically. **No copy and paste or separate Apply step is needed.** The preview opens with missing details highlighted.
5. Ask conversationally for revisions, such as “Make the introduction shorter” or “Reduce estimated expenses to RM1,500.” Changes are applied to the document and listed beneath the conversation. **Undo AI changes** restores the previous affected values.
6. Review generated wording, factual details and every estimate. Complete missing date, venue, committee, approval and other required details through the editor or further prompts.
7. **Save draft**, run server checks, then **Download Word**. The backend validates again before export.

The document conversation survives editor saves and is held in browser sessionStorage, keyed by document. New documents have separate conversations. Saved document content and versions live on the backend; conversations are not a permanent cross-browser record.

**Help me write** buttons insert writing directly into the selected field, preserve other fields and offer **Undo writing change**. Select the button again to regenerate. Audit recommendation writing targets the selected finding only. The separate sidebar **AI assistant** provides general advice; editing actions happen in a selected document’s prompt panel.

AI cannot change calculated totals. New AI-created proposal expenses are labelled **AI estimate**, even if the provider tries to call them confirmed. Unknown required row amounts stay missing rather than being inferred as zero. New AI-proposed funding rows remain unconfirmed until the user selects Confirmed in the funding table. Existing unchanged rows preserve their basis. Prompts instruct Gemini to avoid invented dates, identities, approvals, signatures, commitments, transactions and audit evidence; this is not a mathematical guarantee of model factual accuracy. Review remains essential.

## Receipt scanner

Use **Receipt scanner** in the sidebar to import into a saved expense report, or open an expense report’s **Entries & amounts** tab to import into the current document.

1. Choose a JPG, PNG or PDF, up to **8 MB**.
2. The backend validates MIME, encoding, size and file signature, then sends the bytes to Gemini as inline multimodal input. Receipts are sent to Google for processing when you request a scan.
3. The original and extracted merchant, date, receipt number, currency, subtotal, discounts, tax, total and item lines appear side by side.
4. Review and correct values. Unreadable values are null; extraction uncertainties and amount reconciliation warnings are displayed without invented confidence scores.
5. Choose a category and optional payment method, then **Confirm and add expense**. A valid merchant, real calendar date, MYR currency and valid total are required. No expense is created merely by scanning.
6. Report totals update immediately. Save an editor draft to persist the new entry; sidebar imports save the chosen report directly.

Identical files are detected using SHA-256. Existing report entries are checked by original receipt ID and case-insensitive receipt reference. A file scanned previously is a warning because it may not yet have been imported. Changing a reference cannot bypass the same-file check within a report. Duplicate references can also be entered manually; validation flags these as review warnings. The system does not establish fraud or independently authenticate a receipt.

Originals and extraction metadata stay in the private local `data/receipts` folder. Generated UUIDs determine disk filenames; uploaded names never become filesystem paths. Scanning does not retain corrections as a separate receipt record: the confirmed merchant, date, description, amount and reference are saved in the expense entry. Review corrections to item detail, tax or subtotal before import; they are not separate accounting ledger fields. Foreign currency conversion is manual; expense reports use MYR.

## Templates and calculations

| Template | Inputs and deterministic checks |
| --- | --- |
| Kertas Kerja Program | UPM, UM, UKM, UiTM, UniSZA or Other; purpose, objectives, justification, attendees, date and venue, committee, chronological schedule, estimated budget, funding, outcomes, approvals, appendices. Budget summary counts only explicitly confirmed funding and flags shortfalls and an exceeded planned budget limit. |
| Invoice | Supplier/customer details, invoice reference, valid issue/due dates, positive quantities, prices, fixed per-line discounts and user-configured applicable tax. Ordinary invoice, **not a validated Malaysian e-Invoice**. |
| Expense report | Merchant, date, category, description, amount, receipt reference and optional payment method; reporting-period checks, total expenses, category breakdown and duplicate/missing receipt warnings. |
| Internal audit report | Scope, objectives, criteria, checklist, evidence references, findings, risk, recommendations, owners, deadlines and statuses. High-risk findings require recommendations. Summary shows finding counts, not monetary totals. No unsupported statutory audit opinion. |
| Profit and loss statement | Revenue, COGS, operating costs, supported other income and expenses; gross profit and net profit/loss. User-prepared and **unaudited**. |

Financial summaries concern the document’s budget or business figures, **not application fees**. Each quantity × price rounds half up to cents. Quantities allow three decimals; MYR amounts and tax rates allow two. Invoice tax applies after fixed discounts. The shared engine uses integer cents and BigInt arithmetic; Gemini does not perform final calculations.

University templates are generic and customisable, not verified official institutional forms. Public UPM guidance was reviewed for structural reference; see `docs/SOURCES.md`. Users can upload a PDF template in the proposal editor: Gemini summarises visible headings and formatting guidance for review and document context. **This reference feature does not clone the uploaded layout or change the DOCX style automatically.** Export uses paperIN’s A4 layout.

## Saving and versions

Drafts persist in `data/drafts.json`; saved snapshots persist in `data/drafts.json.versions`. Each save increments the document version and preserves creation time. In a saved editor, select **Saved versions**, then **Restore into editor**. Save again to keep the restored content as a new version. Deleting a draft deletes its saved version history; independent export verification records remain.

Atomic file replacements reduce partial-write risk. This JSON store is intended for one backend process. Do not run concurrent servers against the same data directory. Back up the **entire data directory** with the app stopped, including receipts and verification records. Invalid draft JSON stops startup rather than overwriting it. SQLite and concurrent multi-process storage are not implemented.

## Export authenticity verification

Each valid Word export contains a document ID, creation timestamp, export version, content SHA-256 and random verification token. A separate server record holds the snapshot and the SHA-256 of the final DOCX bytes. For a saved draft, exports share its ID and increment export versions. Unsaved exports receive independent IDs. Draft save versions and export versions are separate sequences.

Open **Document verification**, enter the token, then optionally upload the original `.docx` to compare bytes:

- **Known**: the token exists in this local server; file bytes have not been compared.
- **Matched**: exact bytes match the stored export hash.
- **Mismatched**: uploaded bytes differ, including legitimate edits or re-saving in Word.
- **Revoked**: this local record was revoked.
- Unknown tokens return a clear not-found error.

A matched file establishes equality with this server’s recorded export, not truth, approval, authorship or copyright. Documents can still be copied. No QR code or external public verification service is included. Anyone with access to this single-user local workspace can revoke records. Losing the data directory loses the trusted records.

## Security and operational scope

The backend binds to **127.0.0.1** by default. This delivery is a **single-user local application**, with no registration, login, tenant isolation or document ownership controls. Do not expose it as a multi-user public service. Authentication and ownership tests are consequently not claimed.

API mutations are limited to 60 requests per client IP per minute. Non-local hostnames and foreign browser origins are rejected; the local Vite development origin is permitted. Server-side schemas and business rules validate documents and exports. Uploaded files have bounded sizes and generated storage identifiers. Express does not advertise its version. These controls do not replace authentication or deployment hardening.

Gemini uses up to three attempts, exponential 500/1000 ms backoff and a 30-second request timeout. Retry-After is respected: short delays are observed; long delays return an actionable error instead of retrying early. Permanent 400/401/403/404 failures are not retried. Invalid keys and unavailable models map to actionable server errors without echoing secrets. JSON drafts and receipts are validated before application. No successful AI response is replaced with a fabricated local response. Legacy starter endpoints remain separately labelled non-AI and are not the editor’s writing workflow.

## Evidence and limitations

```sh
npm test
npm run build
```

See `docs/TEST-RESULTS.md` and the recorded logs. **146 automated tests pass** across domain, HTTP, provider-contract and React/JSDOM workflows with a real local backend. Provider responses in those tests are controlled mocks, not live Gemini. Five real server-generated DOCX samples were rendered and inspected for layout.

**No real Gemini key was supplied in this environment. Live document generation, configured-account model availability and live receipt extraction are therefore unverified.** Receipt tests use a synthetic PNG fixture, not an actual merchant receipt. There was no browser-rendered visual or responsive QA; interaction checks use JSDOM. Real Windows/macOS launcher execution, public deployment and professional/institutional compliance are unverified.

No PDF export, quotations, purchase orders, cloud hosting, public QR verification or multi-user authentication is included. The app has not been deployed. The included `.env` is blank, and no real user data or API credentials are packaged.

## Source layout

- `src/`: React interface, document assistant, receipt review, version history and verification page.
- `shared/domain.ts`: reusable template definitions, Zod validation, financial calculations and preview sections.
- `server/patch.ts`: structured document patches and isolated field writing.
- `server/gemini.ts`: server-only REST requests, model check, timeouts and retries.
- `server/receipts.ts`: bounded uploads, multimodal extraction and original receipt storage.
- `server/verification.ts`: trusted local export snapshots and exact-byte checks.
- `server/store.ts`: draft persistence and saved versions.
- `server/export.ts`: A4 Word generation with tables, page numbers and verification metadata.
- `tests/`: automated evidence; `docs/`: sources, test results and limits.

## Copyright and third-party materials

The templates and interface are original working structures informed by the linked public guidance, not reproductions of full university forms or proprietary standards. Third-party libraries retain their own licences. No university, accounting body or Google endorsement is claimed. Users remain responsible for rights to uploaded templates, receipts and content. No third-party standards text is bundled.
