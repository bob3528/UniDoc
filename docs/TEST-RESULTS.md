# Test evidence

Verified for the AI-first local release, 11 October 2026 Malaysia time.

`npm run build`: TypeScript checking and Vite production build passed.

`npm test`: **146 tests passed across 6 files**.

| Suite | Tests | Evidence |
| --- | ---: | --- |
| Domain | 55 | Required fields, date/time consistency, invoice discounts/tax, decimal-safe totals, budget shortfalls, expense categories, receipts, audit rules, P&L. |
| Legacy writing helpers | 9 | Explicitly labelled non-AI starters and bounded provider failures. These are not the new document editor workflow. |
| Assistant client | 17 | REST prompt contract, JSON validation, key isolation, bounded retries, permanent failures and truncation. Mocked provider. |
| Patches, receipt pipeline, model check, records | 21 | Automatic schema patches, missing numeric values, estimated vs confirmed figures, invalid patches, isolated finding writing, MIME/size checks, inline multimodal bytes, original retention, duplicate hashes, uncertain extraction, local record match/tamper/revoke and save versions. Mocked provider with synthetic image fixture. |
| HTTP | 25 | Real isolated Express server; create/edit/save/reopen/validate/export for every type, built frontend serving, malformed inputs, trusted Word export metadata, exact-byte verification, foreign-origin rejection and upload spoofing rejection. |
| React integration | 19 | JSDOM connected to a real isolated server. Navigation, all templates, editing rows and totals, save/reopen/export, automatic writing and Undo, one-prompt creation/export of all five types, missing-field preview and corrected receipt import with duplicate prevention. Controlled Gemini responses. |

The tests use temporary isolated data folders and fake test-only keys. They do not use live user records or a real Gemini key. The 1×1 PNG receipt fixture is synthetic and establishes transport/validation/UI behaviour, not OCR accuracy.

Five sample Word documents were generated through the real export endpoint, opened as valid OOXML archives, rendered using LibreOffice and inspected across **11 pages**: proposal 3, invoice 2, expense report 2, audit 2, P&L 2. Tables, repeating headings, budget basis, financial summaries, signatures, page numbers and verification metadata were checked. Verification paragraphs were kept together after the initial render exposed a split block. These QA documents/images are not shipped as user data.

## Not verified

- **Actual Gemini requests:** no real key was supplied. Live one-prompt generation, account model availability and actual merchant-receipt extraction are unverified.
- **Visual browser/responsive QA:** browser automation was unavailable; interaction tests are JSDOM, not a rendered browser session.
- **Authentication/ownership:** absent in this local single-user release, so access-isolation claims and tests are not made.
- **Windows/macOS launchers:** scripts prepared; not executed on those platforms.
- **Public deployment, official university compliance, e-Invoice validation, statutory audit or professional accounting certification:** not implemented or claimed.
- **Exact uploaded-template layout reproduction, QR code/public verification, PDF export:** not implemented.

The separate raw test/build logs record the final successful checks. The application remains manually usable during a Gemini outage.
