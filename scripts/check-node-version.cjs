/**
 * Node.js Version Validator
 * Enforces Node.js version compatibility with Vite 8 and project dependencies (^20.19.0 || >=22.12.0).
 */
const [major, minor, patch] = process.versions.node.split('.').map(Number);

const isCompatible =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 12) ||
  major > 22;

if (!isCompatible) {
  console.error('\n===============================================================');
  console.error('[ERROR] Incompatible Node.js version detected: ' + process.version);
  console.error('Dependencies in this project (including Vite 8) require:');
  console.error('  Node.js ^20.19.0 OR Node.js >=22.12.0 (LTS recommended)');
  console.error('Please download and install a supported version from https://nodejs.org/');
  console.error('===============================================================\n');
  process.exit(1);
}

if (process.argv.includes('--verbose')) {
  console.log(`[OK] Node.js ${process.version} meets dependency requirements (^20.19.0 || >=22.12.0).`);
}
process.exit(0);
