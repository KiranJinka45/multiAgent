const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appsDir = path.join(root, 'apps');
const pkgsDir = path.join(root, 'packages');

function updatePkgJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let pkg = JSON.parse(content);
  let changed = false;

  // 1. Rename certain app packages to follow @apps/* convention if not already
  if (filePath.includes('apps') && !pkg.name.startsWith('@apps/')) {
    const dirName = path.basename(path.dirname(filePath));
    pkg.name = `@apps/${dirName}`;
    changed = true;
  }

  // 2. Fix dependencies
  const fixDeps = (deps) => {
    if (!deps) return;
    const ren = {
      "@packages/runtime": "@packages/preview-runtime",
      "@apps/preview-runtime": "@packages/preview-runtime",
      "@apps/sandbox-runtime": "@packages/sandbox-runtime"
    };
    for (const [oldName, newName] of Object.entries(ren)) {
      if (deps[oldName]) {
        deps[newName] = deps[oldName];
        delete deps[oldName];
        changed = true;
      }
    }
  };

  fixDeps(pkg.dependencies);
  fixDeps(pkg.devDependencies);
  fixDeps(pkg.peerDependencies);

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist' && file !== '.turbo') {
        walk(fullPath);
      }
    } else if (file === 'package.json') {
      updatePkgJson(fullPath);
    }
  }
}

walk(appsDir);
walk(pkgsDir);
updatePkgJson(path.join(root, 'package.json'));
