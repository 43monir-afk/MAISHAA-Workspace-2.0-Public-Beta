# RESUME_HERE — MAISHAA Workspace (checkpoint)

Date: 2026-10-27 (updated after the second round). Purpose: use iLovePDF, remove.bg, Canva and Adobe Photoshop as landmarks and improve workspace.maishaa.bd.

## Completed (verified in the build/test environment, not in a live browser)
1. `package.json`: `onnxruntime-web` pinned to `1.21.0` (required by `@imgly/background-removal`). Before this, `npm install` failed with ERESOLVE. `package-lock.json` was regenerated.
2. `src/services/aiSegmentationService.ts`: 90 s timeout and clear error for the IS-Net model download (`timeoutMs` option).
3. `src/services/pdfService.ts`: new `addWatermark`, `addPageNumbers`, `reorderPages`, `parsePageOrder`.
4. `src/components/pdf/PdfStudio.tsx`: new tabs Reorder Pages, Watermark, Page Numbers (Bangla + English labels).
5. `src/services/pdfStandardEncryptionService.ts` (new, dependency `@neslinesli93/qpdf-wasm@0.3.0`): real AES-256 PDF protection. Protect and Unlock in PdfStudio now use it; legacy "MAISHAA envelope" files still unlock.
6. Sign PDF (visual signature: draw / type / upload; NOT a cryptographic signature): `addSignature` in pdfService, `SignaturePad.tsx`, new tab.
7. Redact PDF: `pdfRedactService.ts` + `RedactionEditor.tsx` (drag boxes). Redacted pages are rebuilt as images so hidden text is truly removed; other pages are copied unchanged.
8. PDF -> PowerPoint: `convertPdfToPptx` / `buildPptxFromPageImages` in conversionService + ConvertStudio entry. One picture slide per page (text NOT editable).
9. Compare PDF: `pdfCompareService.ts` (page-by-page text diff via PDF.js, report exported as PDF with the Bengali-capable exporter). Needs exactly 2 files; scanned PDFs are refused.
10. ImageStudio: version history (Undo / Redo / "Continue editing with this result").
11. New tests: pdfWatermarkNumbersReorder, pdfStandardEncryption, pdfRedact, pdfToPptx, pdfCompare.

## Test status
- `tsc --noEmit` pass, `npm run build` pass.
- `vitest`: 331 pass, 3 fail (same 3 as before). The 3 failures are Background Removal tests (`bgRemoverStudio.test.ts` 1, `services.test.ts` 2) that need to download the AI model from staticimgly.com; that host is unreachable in the sandbox. Not confirmed on a networked machine.
- Protect PDF output was independently checked with poppler `pdfinfo` (AES-256, password required).
- NOT verified: real browser run of any UI (qpdf wasm loading, signature pad, redaction canvas rendering, PDF page rendering used by Redact/Compare-free paths, PPTX from real pages, Compare report PDF export with Bengali), Windows build, live Render deploy. The canvas/PDF.js rendering paths cannot run in the Node test environment; only their pure logic is tested.

## Known gaps vs landmark sites
iLovePDF: still missing Edit PDF, OCR-based Word/Excel conversions, AI Summarizer/Translate, true text-editable PDF->PPTX. Watermark and typed signature support English text only (built-in PDF fonts); Bengali signatures work via Draw/Upload.
remove.bg: batch queue, ZIP export, erase/restore and background replacement exist (BackgroundStudio). Cut-out quality not compared.
Canva: templates, brand kit, bulk create, layers, undo exist. No video editing, no animation, small template set, no stock library.
Photoshop: ImageStudio now has undo/redo and chained edits. Still no layers, curves/levels or selection tools.

## Round 3: Sidebar and "All Tools" home grid (2026-10-27)
- `Sidebar.tsx`: removed the "Upgrade to Pro Plan" box (its button only opened Templates; no paid plan exists). The tool list now has a thin visible scrollbar (`.sidebar-scroll` in index.css) so no tool is hidden. Only the ad slot stays at the bottom.
- `Header.tsx`: removed the "Pro Plan" badge for the same reason. To restore, see git-less backup: re-add the button that calls `setActiveModule('office_pack')`.
- `UniversalWorkspace.tsx` All Tools: search box, category chips (PDF & Convert, Images, Documents, Design, Smart tools), result count, "No match" state, equal-height cards (real `<button>`s, focus ring, darker text), "New" badge on PDF, Image and Convert, updated PDF/Image/Convert descriptions. The old "View All Tools" link (it opened Batch) was replaced by the count.
- New test: `toolsGridFilter.test.tsx`. Vitest: 332 pass, 3 fail (same 3 Background Removal tests that need internet). tsc and build pass.
- NOT verified visually: layout in a real browser (4 columns on lg, 5 on 2xl, 1 on phones). Pre-existing: "Recent files" on the home page is hard-coded sample data.

## Round 4: research-driven additions (2026-10-27)
Research sources (public pages only): PDF24 Tools (24 tools), iLoveIMG (tools list), Signaturely/signature-maker roundups, CloudConvert. Gap vs workspace -> implemented:
- PDF Studio: **Add Text** (Edit PDF light; adds new text, does not edit existing text; English only), **Overlay PDF** (letterhead/stamp over or behind, first page or page-by-page), **Extract Images** (ZIP; JPEG + plain 8-bit RGB/Gray as PNG; masks, CMYK, predictor/other encodings are skipped and the count is shown). Files: `pdfExtrasService.ts`, tabs in `PdfStudio.tsx`. `assertLatinText` and `hexToRgb` are now exported from pdfService.
- Image Studio: **Watermark & Caption** tab (Bengali supported via system fonts, 9 positions, opacity, colour, meme style outline, tiled watermark pattern). Files: `imageTextOverlayService.ts`.
- Tests: `pdfExtras.test.ts` (4), `imageTextOverlay.test.ts` (3). Extracted PNG decoded with Pillow as a cross-check. Vitest 339 pass, 3 fail (same Background Removal ones, need internet). tsc and build pass.
- NOT verified in a real browser: the new tab UIs, canvas drawing of the text overlay, Bengali font rendering on canvas (depends on installed fonts).
- Not done (and why): Webpage->PDF and HTML->Image (need a server/headless browser), CloudConvert-style 200+ formats (server side), Signaturely cloud save/e-sign requests (needs accounts/backend), Gamma-style AI deck design.

## Next practical steps
1. `npm install`, `npm run dev`, then test every new tab in a real browser (Protect/Unlock, Watermark, Page Numbers, Reorder, Sign, Redact, Compare, PDF->PPTX, Undo/Redo).
2. Fix anything the browser run reveals, then deploy to Render.
3. Candidates after that: Edit PDF (text/shape overlay), curves/levels in ImageStudio, more Canva-style templates.

## Round 5: accounts, Free/Pro, admin panel, contact, desktop app (2026-10-27)
Built from scratch in this round (the earlier backend from the previous chat was NOT in the uploaded zip):
- `server/` (crypto, store, ratelimit, api, express adapter) + `server/tests/*.nodetest.ts` (20 tests, run with `npm run test:server`, all passing in the build sandbox).
- `server.ts`: mounts the API; `/api/ai/chat|translate|command|execute` now go through `requireFeature` (sign-in, plan, daily limit). `/signin /account /admin` are served `noindex`; `/pricing /contact /download` added to the SEO registry.
- `src/config/plans.ts`: the single place that defines Free vs Pro.
- Frontend: `AuthContext`, `src/components/site/*` (Auth, Account, Pricing, Contact, Download, Admin, UserMenu, ProGate), Header/Sidebar links, Pro lock on Batch, Office Pack, AI Command Center and PDF tabs (redact, protect, compare, overlay, pdfa), AI drawer shows daily usage + sign-in/upgrade prompts.
- `desktop/`: Electron wrapper with key activation (needs Windows build, see desktop/README.md).
- NOT verified: `npm install` is blocked in the build sandbox, so `tsc`, `vite build`, `vitest` and a real browser/Electron run were NOT executed for this round. Frontend files were only type-checked against stubbed React/lucide typings (no errors in the edited files). Run `npm install && npm run lint && npm test && npm run build` first.
- Known gaps: no payment gateway, no password-reset email (admin resets), no SMTP for contact, `/api/ai/ocr` and `/api/image/*` are still unauthenticated, About page text still says "100% free with ads".

## Round 6: verification of the Round 5 zip + home/sidebar honesty fixes (2026-10-27)
Verified on a clean `npm install` (33 s, Node 22): `npm run lint` pass, `npm run build` pass, `npm run test:server` 20/20, `vitest` all pass except the same 3 Background Removal tests that need internet. (Round 5 had never been type-checked/built before this.)
Changes (Sidebar + All Tools home):
- Card descriptions now match what each studio really does (Document Studio is read-only text + TXT/DOCX export, Spreadsheet Studio has no charts/sheet creation, Convert has no "many more formats", Batch has no "100+" claim, AI Assistant text matches Bengali). PDF Studio card lists the new tools in both languages.
- Home "Recent Files" showed hard-coded sample files; it now lists real items from the session history (opens the history window) and has an empty state.
- Sidebar: removed "My Files", "Favorites", "Cloud Storage" (they only navigated Home; no backend exists).
- Home upload box said "Max 500 MB"; the enforced limit is 150 MB (`validateFileInput`), text corrected.
- New test: `homeHonesty.test.tsx`.
Not changed (needs your decision): Help/SEO text says 100 MB while the code allows up to 150 MB; the About text and home copy claim "Bangladesh's first integrated office suite" (unverifiable) and FAQ "completely free?" while a Pro plan exists; "Monetization supports free tools" ad label.
NOT verified visually: no real browser run, so layout/spacing of the sidebar and grid on actual screens is unchecked. The screenshots you sent show an older deployed version (with the "Upgrade to Pro Plan" box) that this zip no longer contains.

## Round 7: AI / OCR / image API security (2026-10-28)
`/api/ai/ocr`, `/api/ai/image-to-prompt`, `/api/image/remove-bg`, `/api/image/generate-bg` were unauthenticated. Now:
- Sign-in required (cookie session or desktop licence token) -> 401 `LOGIN_REQUIRED`; Free/Pro daily quota and per-minute burst limit per account (`src/config/plans.ts`: `aiOcr`, `aiImagePrompt`, `bgRemoveCloud`, `bgGenerate`; numbers are defaults, change them there).
- Quota is RESERVED when the request passes and refunded if the handler answers non-2xx (`requireFeature` in `server/express.ts`). The old "count after response" let parallel requests overrun the daily limit; this applies to chat/translate/command too.
- Image validation (`server/imageGuard.ts`): JPEG/PNG/WebP only, type from magic bytes (client `mimeType` ignored), size from base64 length before decoding (Free 4 MB, Pro 7 MB), `customInstruction`/`prompt` length by plan, `targetLanguage` allowlist.
- `protectExpensiveRoutes` runs BEFORE `express.json()` so anonymous / over-quota / oversized requests are refused without buffering 10 MB. Chunked requests without Content-Length are still capped by the 10 MB parser limit.
- Upstream error text is no longer returned to the browser (logged server-side).
- Bug fixed: `bgRemoverService` sent multipart FormData but the server only reads JSON, so cloud background removal could never work. It now sends `{ imageBase64, provider }`.
- Usage appears in `/api/usage`, the Account page list, and `aiByFeature` in `/api/admin/stats`.
- Tests: `server/tests/imageGuard.nodetest.ts` (22; real express + real HTTP, only Gemini/remove.bg are stubbed). `npm run test:server` 42/42, `tsc` clean, `vitest` 343/343 (with the updated `src/__tests__/setup.ts` that stubs only model download), `vite build` ok.
- NOT verified: real Gemini / remove.bg / Imagen calls (no keys here), real browser, the Render deploy. Quota/rate state is in memory + JSON file, single instance only. Behind CGNAT many users share one IP; the per-IP flood cap is 60/min per route, the real limits are per account.
- Follow-ups done: (a) cloud background removal that is refused/unavailable now tells the user why (`fallbackNotice` from `removeBackground`, shown by BackgroundStudio; test `bgCloudFallbackNotice.test.ts`). (b) CORRECTION: the desktop app DOES send the licence header (`desktop/main.js`, `X-Maishaa-License` via `webRequest.onBeforeSendHeaders`); an earlier note saying otherwise was a grep mistake (case-sensitive search). No change needed. (c) Quota is persisted in the JSON file, but the burst limiter is in memory and both assume ONE instance (Render: 1 instance + persistent disk). Running 2+ instances needs a shared store (Redis/DB); the server now logs a warning if it detects that.

## Round 8: new brand logo (2026-10-28)
Logo = the "MAISHAA WORKSPACE / M²" badge supplied by the owner. Generated from that image: `public/logo-512.png`, `logo-1024.png` (transparent corners), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (badge on white), `favicon.svg` + `favicon-32.png` (blue M² tile, redrawn as vector), `og-image.png` (1200x630), `desktop/icon.png`.
- `Logo.tsx`: large size -> `/logo-512.png`, small (<72 px) or `variant="mark"` -> `/favicon.svg`.
- `brandAssets.test.tsx` updated (the old test asserted the previous `logo.svg` was an outlined-text SVG). `public/logo.svg` is the PREVIOUS logo; nothing references it any more, delete it when you are happy.
- Verified: tsc, vitest 353/353, test:server 42/42, vite build, and a headless-browser load of the built app (header mark + home badge render). NOT verified: Windows desktop build, social-share preview on a real platform, tiny favicon sharpness in real browser tabs.
- The badge is a raster (PNG). For print/large banners ask for a vector or a higher-resolution original.


## Round 9
- Deleted `public/logo.svg` (old logo) and hero photos (`public/images/hero.jpg`, `hero.webp`, `hero-640.webp`), removed `HeroPhoto.tsx` and its use on the Home banner; `brandAssets.test.tsx` updated to assert they are gone.
- Verified: `tsc --noEmit` clean, vitest 353 tests pass (counts as of this run), server tests 42/42, `vite build` OK. Not verified visually in a browser.

## Round 10: welcome banner on Home (2026-10-28)
- New `public/images/maishaa-banner-{1000,2000,3000}.webp` (54 / 126 / 199 KB): pre-rendered composite = owner's circular logo top-left on the "Welcome to MAISHAA Workspace" banner artwork + retouched family photo in an arch frame + tool cards (PDF to Word, Compress, Merge PDF, XLSX/PPTX tags). Text in the image is raster (not editable); regenerate from the design source to change it.
- New `src/components/common/HomeBanner.tsx` (sr-only `<h1>`, responsive `srcset`). `UniversalWorkspace.tsx`: banner shown from `md` up; phones keep the compact logo + title + pills block (`md:hidden`).
- Real children's photo is public again on the site (owner's decision, 2026-10-28). The earlier removal of hero photos (Round 9) still applies to `hero*.webp` names; `brandAssets.test.tsx` updated (banner files exist and are valid WebP, Home renders the banner).
- The artwork text claims "Safe & Secure" / "100% Private": confirm they are true for every tool before launch.
- NOT verified: `npm install` is blocked in the build sandbox (registry refused), so tsc, vitest and vite build were NOT run for this round. Run `npm install && npm run lint && npm test && npm run build`, then look at Home in a real browser (desktop and phone).

## Round 11: visual PDF Editor (2026-11-18)
- New PDF Studio tab "PDF Editor" (`id: 'editor'`, free, not in PRO_PDF_TABS). Own design; it is NOT a copy of any other site.
- `src/services/pdfEditorService.ts`: edit operations + `applyEdits` (pdf-lib), PDF.js helpers (`loadPdfJsDocument`, `renderPdfPage`, `extractPageTextItems`), find/replace helpers, page ops (`rotatePageBytes`, `deletePageBytes`, `movePageBytes`), `createBlankPdf`.
- `src/components/pdf/PdfEditor.tsx`: lazy page view, tools (select/edit existing text, text, image, signature, whiteout, highlight/underline/strike, draw, rectangle/ellipse/line/arrow), move/resize, Undo/Redo (Ctrl+Z / Ctrl+Y, Delete key), zoom, Find & Replace, Pages panel (rotate/move/delete; pending edits are baked first), "Apply & Download". PdfStudio shows it full width instead of the usual two-column layout.
- Limits (also shown in the UI): editing/replacing text and whiteout only COVER the old text (it stays in the file; use Redact for removal); replaced text uses Helvetica/Times/Courier; non-Latin text (Bengali) is drawn by the browser into an image (not selectable); rotated pages cannot be edited (edit first, then rotate); Find works inside single text items only; scanned PDFs have no text to edit.
- Tests: `src/__tests__/pdfEditor.test.tsx`. NOT RUN (npm registry blocked in the build sandbox). First thing to do: `npm install && npm test && npm run lint && npm run build`, then try the editor in a real browser (desktop + phone) with a text PDF, a scanned PDF, a rotated page and Bengali text.
