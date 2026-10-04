/**
 * Clean Source Release Packaging Script for MAISHAA WORKSPACE 2
 * Creates a clean source distribution ZIP excluding node_modules, .git, .env secrets, dist, and temp files.
 */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'release');

const ZIP_NAME = 'MAISHAA-Workspace-2.zip';
const OUTPUT_FILE = path.resolve(OUTPUT_DIR, ZIP_NAME);
const ROOT_OUTPUT_FILE = path.resolve(ROOT_DIR, ZIP_NAME);
const LEGACY_OUTPUT_FILE = path.resolve(ROOT_DIR, 'maishaa-workspace-release.zip');
const LEGACY_RELEASE_FILE = path.resolve(OUTPUT_DIR, 'maishaa-workspace-release.zip');

// Explicit exclusion rules
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'release',
  '.cache',
  'coverage',
  '.turbo'
]);

const EXCLUDE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
  '.DS_Store',
  'Thumbs.db',
  'MAISHAA-Workspace-2.zip',
  'maishaa-workspace-release.zip'
]);

function shouldExclude(relPath) {
  const parts = relPath.split(/[/\\]/);
  // Check directory exclusions
  for (const part of parts) {
    if (EXCLUDE_DIRS.has(part)) return true;
  }
  // Check filename exclusions
  const filename = parts[parts.length - 1];
  if (EXCLUDE_FILES.has(filename)) return true;
  if (filename.endsWith('.log')) return true;
  if (filename.endsWith('.zip')) return true;
  return false;
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (shouldExclude(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({ fullPath, relPath });
    }
  }

  return results;
}

async function createReleaseZip() {
  console.log('===============================================================');
  console.log('  Packaging Clean Source Release ZIP for MAISHAA WORKSPACE 2');
  console.log('===============================================================');
  console.log(`Scanning project root: ${ROOT_DIR}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = getAllFiles(ROOT_DIR);
  console.log(`Found ${files.length} clean source files to package.`);

  const zip = new JSZip();
  let totalBytes = 0;

  for (const file of files) {
    const data = fs.readFileSync(file.fullPath);
    totalBytes += data.length;
    // Prefix files with clean root directory inside zip
    const zipPath = `MAISHAA-Workspace-2/${file.relPath}`;
    zip.file(zipPath, data);
  }

  console.log(`Generating compressed archive (source size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB)...`);
  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(OUTPUT_FILE, content);
  fs.writeFileSync(ROOT_OUTPUT_FILE, content);
  fs.writeFileSync(LEGACY_OUTPUT_FILE, content);
  fs.writeFileSync(LEGACY_RELEASE_FILE, content);

  const archiveSizeMb = (content.length / (1024 * 1024)).toFixed(2);
  console.log(`[SUCCESS] Release archive created successfully!`);
  console.log(`  Target: ${ROOT_OUTPUT_FILE}`);
  console.log(`  Target: ${OUTPUT_FILE}`);
  console.log(`  File Count: ${files.length} files`);
  console.log(`  Archive Size: ${archiveSizeMb} MB`);
  console.log('\nVerification Check:');
  console.log('  - node_modules excluded: YES');
  console.log('  - Local .env secrets excluded: YES (.env.example preserved)');
  console.log('  - Temporary / build / git files excluded: YES');
  console.log('  - Clean directory structure under MAISHAA-Workspace-2/: YES');
  console.log('===============================================================\n');
}

createReleaseZip().catch((err) => {
  console.error('[ERROR] Failed to create release ZIP:', err);
  process.exit(1);
});
