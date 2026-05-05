const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '..', 'packages');

if (!fs.existsSync(packagesDir)) {
  console.error("❌ Packages directory not found at:", packagesDir);
  process.exit(1);
}

fs.readdirSync(packagesDir).forEach(pkg => {
  const pkgPath = path.join(packagesDir, pkg, 'package.json');

  if (!fs.existsSync(pkgPath)) return;

  try {
    const content = fs.readFileSync(pkgPath, 'utf-8');
    const json = JSON.parse(content);

    console.log(`🔧 Fixing ${pkg}...`);
    
    json.main = "dist/index.cjs";
    json.module = "dist/index.mjs";
    json.exports = {
      ".": {
        types: "./dist/index.d.ts",
        require: "./dist/index.cjs",
        import: "./dist/index.mjs"
      }
    };

    fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
  } catch (err) {
    console.error(`💥 Failed to process ${pkg}:`, err.message);
  }
});

console.log("✅ All packages fixed");
