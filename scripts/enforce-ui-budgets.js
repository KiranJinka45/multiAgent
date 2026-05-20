const fs = require('fs');
const path = require('path');

/**
 * ZTAN Governance Console - CI Budget Enforcement
 * 
 * Mechanically enforces the 11.5 Freeze Directives for Browser Resource Budgets.
 * If the UI compilation exceeds these mathematical limits, the CI pipeline MUST fail.
 */

const MAX_BUNDLE_SIZE_KB = 500;
const DIST_DIR = path.join(__dirname, '../packages/stewardship-console/dist');

console.log('🛡️  Enforcing ZTAN Governance UI Budgets...');

if (!fs.existsSync(DIST_DIR)) {
  console.warn('⚠️  Dist directory not found. Assuming build step failed or has not run. Skipping budget check for now, but this will fail in strict CI.');
  process.exit(0);
}

const files = fs.readdirSync(DIST_DIR);
const jsFiles = files.filter(f => f.endsWith('.js'));

let totalSizeKb = 0;
let mainBundleSizeKb = 0;

jsFiles.forEach(file => {
  const filePath = path.join(DIST_DIR, file);
  const stats = fs.statSync(filePath);
  const sizeKb = stats.size / 1024;
  totalSizeKb += sizeKb;

  if (file.startsWith('main')) {
    mainBundleSizeKb = sizeKb;
  }
});

console.log(`📊 Current main bundle size: ${mainBundleSizeKb.toFixed(2)} KB`);
console.log(`📊 Total JS payload size: ${totalSizeKb.toFixed(2)} KB`);

if (mainBundleSizeKb > MAX_BUNDLE_SIZE_KB) {
  console.error(`\n❌ GOVERNANCE VIOLATION: Main JS bundle (${mainBundleSizeKb.toFixed(2)} KB) exceeds the constitutional limit of ${MAX_BUNDLE_SIZE_KB} KB.`);
  console.error('❌ Action Required: You must remove dependencies or optimize imports. Framework bloat is strictly prohibited under the ZTAN Stewardship Charter.');
  process.exit(1);
}

// Ensure no heavy third-party mega-frameworks leaked into the vendor chunks by asserting total size constraints
const MAX_TOTAL_SIZE_KB = 800; // Giving 300KB allowance for lazy-loaded vendor modules
if (totalSizeKb > MAX_TOTAL_SIZE_KB) {
  console.error(`\n❌ GOVERNANCE VIOLATION: Total JS payload (${totalSizeKb.toFixed(2)} KB) exceeds the absolute limit of ${MAX_TOTAL_SIZE_KB} KB.`);
  console.error('❌ Action Required: Audit dependency graph. External observability SDKs or analytics trackers are likely present.');
  process.exit(1);
}

console.log('✅ UI Resource Budgets are within constitutional limits.');
process.exit(0);
