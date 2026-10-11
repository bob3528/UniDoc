# Template reference guidance

Researched 10 October 2026. These references inform structure and labelling, not claims of compliance. The application uses original schemas; no proprietary templates or full standards are reproduced.

| Primary source | Reference | How paperIN uses it |
| --- | --- | --- |
| LHDN / IRBM | [e-Invoice guidelines](https://www.hasil.gov.my/en/e-invois/rujukan-pelaksanaan-e-invois/garis-panduan/), including general guideline v4.8 and specific guideline v4.9 as listed at research time; [MyInvois invoice structure](https://sdk.myinvois.hasil.gov.my/documents/invoice-v1-0/) | Invoices separate supplier/customer identity, dates, references, item amounts, discounts, configurable tax and totals. paperIN omits the mandatory MyInvois data model and submission workflow and explicitly labels its exports as ordinary documents. |
| MASB | [Approved accounting standards for private entities](https://www.masb.org.my/pages.php?id=20), [MPERS 2025 information](https://www.masb.org.my/pages.php?id=615), [MFRS listing](https://www.masb.org.my/pages.php?id=89) | Framework context for financial reporting. The P&L deliberately stays a simple unaudited management statement; it is not represented as a full standards-compliant reporting package. MPERS 2025 has an effective-date transition, so the app does not automatically choose a statutory framework. |
| MIA | [MPERS FAQs](https://mia.org.my/wp-content/uploads/2022/07/MIA_MPERS_FAQs.pdf) | Context on the applicable reporting framework and professional accounting review. No claim that the app replaces a professional accountant. |
| SSM | [Annual submission guidance](https://www.ssm.com.my/Pages/Register_Business_Company_LLP/Company/Annual-Submission.aspx) and [Companies Act 2016](https://www.ssm.com.my/Pages/Legal_Framework/Companies-Act-2016.aspx) | Distinguishes recordkeeping and management summaries from statutory financial statement preparation and lodgement. Expense entries retain dates, category, method and supporting receipt references. |
| The IIA | [2024 Global Internal Audit Standards](https://www.theiia.org/en/standards/2024-standards/global-internal-audit-standards/), including engagement findings, recommendations/action plans and final communication | Original audit working-document structure covering scope, objectives, criteria, evidence, findings, risk, recommendations, owner, deadline and status. The app does not certify conformance with the standards. |

The requirement that a high-risk finding must have a recommendation is an **application business rule**, not a claim that this one rule implements all IIA requirements. Duplicate receipt detection is a simple case-insensitive reference check, not fraud detection. Tax is chosen by the user and not assessed by paperIN.

## University template provenance

The supplied prior project contained unverified demonstration university profiles. paperIN therefore presents a generic Malaysian Kertas Kerja Program structure and institution selections for UPM, UM, UKM, UiTM, and UniSZA. All institution selections share the generic structure. Before submission, users must customise it to their current institutional requirements. No official university endorsement is claimed.

## Gemini implementation reference

[Google Gemini generateContent API](https://ai.google.dev/api/generate-content?hl=en) and [text generation documentation](https://ai.google.dev/gemini-api/docs/generate-content/text-generation). The server uses the REST API with a server-side key header, conversation roles, and JSON output mode for document text drafts. Draft responses are independently validated before being offered to the user.

## Additional references checked for this update

- [UPM PKPP programme-paper guidance](https://pkpp.upm.edu.my/upload/dokumen/20200306113303Slide_Penyediaan_Kertas_Kerja_latest.pdf): public guidance describes purpose/background, objectives, impacts, dates, venue, organiser, target participants, programme content, estimated expenditure and approval sections. This is structural reference, not verification that paperIN reproduces a current official form. The PDF is not bundled.
- [UPM KKB paperwork-format listing](https://pkpp.upm.edu.my/download_document_credited_co_curriculum/kertas_kerja_program_komuniti/kkb_paperwork_format-63463?L=bm): linked for users seeking institutional source material.
- [Gemini Generate Content document processing](https://ai.google.dev/gemini-api/docs/generate-content/document-processing): inline PDF/image multimodal requests; paperIN imposes its own stricter 8 MB limit.
- [Gemini Models API](https://ai.google.dev/api/models): configured-model metadata and supportedGenerationMethods availability check. No unverified model fallback is used.

Research is public-source inspection, not professional or institutional certification. Live Gemini functionality requires a user-configured key and has not been verified in this environment.
