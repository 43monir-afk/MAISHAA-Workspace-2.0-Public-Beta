# MAISHAA WORKSPACE 2 (মায়িশা ওয়ার্কস্পেস ২)
> **One Workspace. Every Office Task.** | **এক জায়গায় আপনার সব অফিস কাজ।**  
> A privacy-first, browser-local office productivity suite and intelligent document workspace with full bilingual (Bangla & English) support.

---

## Table of Contents
1. [Overview & Capabilities](#overview--capabilities)
2. [What's New in MAISHAA WORKSPACE 2](#whats-new-in-maishaa-workspace-2)
3. [Prerequisites](#prerequisites)
4. [Windows Quick Start & Launcher Fixes](#windows-quick-start--launcher-fixes)
5. [macOS / Linux Quick Start](#macos--linux-quick-start)
6. [Environment & Configuration (.env)](#environment--configuration-env)
7. [Engine Availability & Offline Architecture](#engine-availability--offline-architecture)
8. [Image Studio: Retouch, Prompting & Upscaling](#image-studio-retouch-prompting--upscaling)
9. [Presentation Editor (PPTX)](#presentation-editor-pptx)
10. [Release Packaging (MAISHAA-Workspace-2.zip)](#release-packaging-maishaa-workspace-2zip)
11. [Troubleshooting & Verification](#troubleshooting--verification)

---

## Overview & Capabilities

MAISHAA WORKSPACE 2 is engineered as a secure, browser-first desktop workspace that unifies all essential office tasks into a single zero-bloat dashboard:

- **Homepage Experience**: Clean neutral gray `#E7EBF0` layout, white cards, navy text `#0a192f`, teal buttons `#0d9488`, lightweight 3D document icons, responsive typography, and reduced-motion accessibility.
- **“আপনি কী করতে চান?” Interactive Task Search**: Instantly filter and navigate between all 10 specialized office studios.
- **3-Step Universal Guide**: 1. কাজ বেছে নিন (Choose Task) → 2. ফাইল বা টেক্সট দিন (Provide File/Text) → 3. ফলাফল দেখে ডাউনলোড করুন (Review & Download).
- **One-Click Office Packs**: Assemble complete deliverable packages (DOCX Report, PDF Summary, Excel Sheet, PowerPoint Slides) from raw text or templates.
- **Presentation Editor & Studio**: Inspect slide decks, edit titles and bullet points, reorder slides, and export genuine OpenXML `.pptx` presentations via `pptxgenjs`.
- **Photo Retouch & Prompt Studio**: 32-bit floating point color retouch (brightness, contrast, saturation, warmth) with lossless PNG download preserving natural resolution and alpha transparency; Image → AI Prompt with consent and quota handling; and Quota-Free Manual Prompt Builder.
- **Searchable PDF & Dual OCR**: Local Tesseract OCR + server-side Gemini Vision OCR with Noto Sans Bengali font embedding and selectable transparent text layers.
- **Office Cross-Conversions**: 100% genuine OpenXML DOCX, Excel XLSX, PowerPoint PPTX, and vector PDF conversions.
- **Bangladesh Smart Forms Hub**: Ready-to-use government, banking, corporate, and educational application forms with automatic field validation and instant PDF printing.

---

## What's New in MAISHAA WORKSPACE 2

1. **Reimagined Homepage Design**:
   - Background: Neutral Gray `#E7EBF0`.
   - Cards: Crisp white with subtle borders and shadows.
   - Typography: High-contrast Navy (`#0a192f`) with clear Bengali `Hind Siliguri` font.
   - Action Buttons: Teal (`#0d9488`).
   - 3D Document Icons: Lightweight vector isometric icons for PDF, DOCX, XLSX, PPTX, Image, OCR, Forms, and AI.
   - Reduced-Motion Support: Respects user OS accessibility settings (`motion-reduce:...`).

2. **Image Studio Enhancements**:
   - **Local Photo Retouch**: Sliders for Brightness, Contrast, Saturation, and Warmth/Cool temperature with live preview and "Hold to compare with original" toggle.
   - **Lossless PNG Export**: Preserves natural dimensions, full resolution, and transparency without lossy downsampling.
   - **Image → AI Prompt**: Reverse-engineer uploaded images into generative prompts via Gemini Vision with explicit privacy confirmation and 429 quota handling.
   - **Quota-Free Manual Prompt Builder**: Assemble rich generative prompts (Subject, Style, Lighting, Camera, Mood) without calling any API or using quota.
   - **Background Removal & Super-Resolution**: Client-side alpha masking and multi-pass convolutional bicubic enlargement with Laplacian sharpening.

3. **Presentation Editor**:
   - Full OpenXML PowerPoint editor powered by `pptxgenjs`.
   - Add, edit, delete, and reorder slide bullets and titles.
   - Create blank decks or import existing PPTX files.
   - Export styled PPTX decks with customizable theme color accents.

4. **Searchable PDF Generation**:
   - Scanned document OCR directly embeds an invisible selectable Bengali/English text layer over the source image using `pdf-lib` and `Noto Sans Bengali` font.

---

## Prerequisites

- **Node.js**: Version **^20.19.0 or >=22.12.0** (Node.js 22 LTS recommended).  
  *Enforcement*: Dependencies (including Vite 8) enforce this range. All launchers run `scripts/check-node-version.cjs` at startup.  
  Download: [https://nodejs.org/](https://nodejs.org/)
- **npm**: Version **9.0.0 or higher** (bundled with Node.js).
- **Web Browser**: Any evergreen modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari).

---

## Windows Quick Start & Launcher Fixes

All Windows launchers (`.bat` and `.ps1`) are configured with:
- Automatic directory switching (`cd /d "%~dp0"` and `Set-Location -LiteralPath $PSScriptRoot`) so they run from any desktop shortcut or file manager location.
- **Vite Recognition Fix**: Launchers automatically inspect if `node_modules\` exists. If missing, they run `setup.bat` before attempting `npm run build`, eliminating the `'vite' is not recognized` error.
- Error retention: On any error, launchers `pause` or prompt for input so error messages remain visible on screen instead of closing the command prompt.

### 1. Automated Setup (First-Time Run)
Double-click `setup.bat` (or in PowerShell run `.\setup.ps1`):
1. Verifies compatible Node.js version.
2. Creates `.env` from `.env.example` if not already present.
3. Installs all packages cleanly via `npm install`.
4. Builds the production bundle into `dist/`.

### 2. Launching Production Mode
Double-click `start.bat` (or in PowerShell run `.\start.ps1`):
- Runs `server.ts` through the installed `tsx` runner with `NODE_ENV=production`.
- Directly serves precompiled static assets from `dist/` without starting Vite dev middleware.
- Live at: **`http://localhost:3000`**

### 3. Launching Development Mode
Double-click `dev.bat` (or in PowerShell run `.\dev.ps1`):
- Runs `tsx server.ts` with Vite development middleware and Hot Module Replacement.
- Live at: **`http://localhost:3000`**

---

## macOS / Linux Quick Start

```bash
# 1. Clone or extract repository
cd MAISHAA-Workspace-2

# 2. Check Node version (^20.19.0 or >=22.12.0)
node scripts/check-node-version.cjs

# 3. Setup environment and install dependencies
cp .env.example .env
npm install

# 4. Build and start production server
npm run build
npm start

# Or run in development mode:
npm run dev
```

---

## Environment & Configuration (.env)

The application ships with `.env.example`:

```env
# GEMINI_API_KEY: Optional key for Gemini AI Vision, OCR, and Command Center.
# All offline tools (PDF, Image, DOCX, XLSX, PPTX, Forms) run 100% locally without any key.
GEMINI_API_KEY=""

# Host configuration
APP_URL="MY_APP_URL"
VITE_AI_PROVIDER="gemini"
VITE_AI_API_ENDPOINT="/api/ai/command"
```

- **Offline Privacy**: No API key is required for PDF manipulation, DOCX generation, spreadsheet editing, presentation building, photo retouching, or Bangladesh forms.
- **Cloud AI (Optional)**: If you provide a Google Gemini API Key in `.env`, the system activates Gemini Vision OCR, Image-to-Prompt, and AI Command Intent Planning.

---

## Release Packaging (MAISHAA-Workspace-2.zip)

To generate a clean, production-ready distribution archive:

```bash
npm run package:zip
```

This generates `MAISHAA-Workspace-2.zip` containing:
- Complete source code (`src/`, `scripts/`, `public/`).
- Clean launchers (`setup.bat`, `start.bat`, `dev.bat`, `setup.ps1`, `start.ps1`, `dev.ps1`).
- Configuration files (`package.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`).
- Strictly excludes `node_modules/`, private `.env`, `dist/`, `.git/`, and temporary files.

---

## Troubleshooting & Verification

| Issue | Cause | Fix |
|---|---|---|
| `'vite' is not recognized` | `start.bat` or `npm run build` ran before dependencies were installed | Run `setup.bat` first. `start.bat` in v2 now auto-invokes setup if `node_modules` is missing. |
| Incompatible Node.js Version | Node version is older than 20.19.0 or between 21.0 and 22.11 | Install Node.js 22 LTS from [nodejs.org](https://nodejs.org/). |
| AI Quota Exceeded (429) | Gemini API free-tier rate limits reached | Wait a moment before retrying, or use the Quota-Free Manual Prompt Builder and offline tools. |
| Corrupted PPTX / DOCX | Source file has invalid XML or DRM | Use unencrypted standard OpenXML `.docx` or `.pptx` documents. |
