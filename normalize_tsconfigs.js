const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all directories with tsconfig.json
const root = process.cwd();
const packagesDir = path.join(root, 'packages');
const appsDir = path.join(root, 'apps');

const getTSConfigs = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map(pkg => path.join(dir, pkg, 'tsconfig.json'))
    .filter(p => fs.existsSync(p));
};

const configs = [
  ...getTSConfigs(packagesDir),
  ...getTSConfigs(appsDir)
];

configs.forEach(configPath => {
  console.log(`Processing ${configPath}...`);
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    // Basic JSON parse (ignoring comments for simplicity in this script, or use a proper parser if needed)
    // Since these are usually standard JSON, we can try simple regex/replace to avoid mangling comments
    
    let updated = content;

    // Ensure composite is false
    if (updated.includes('"composite": true')) {
      updated = updated.replace('"composite": true', '"composite": false');
    } else if (!updated.includes('"composite"')) {
      updated = updated.replace('"compilerOptions": {', '"compilerOptions": {\n    "composite": false,');
    }

    // Ensure declaration is true
    if (updated.includes('"declaration": false')) {
      updated = updated.replace('"declaration": false', '"declaration": true');
    } else if (!updated.includes('"declaration"')) {
      updated = updated.replace('"compilerOptions": {', '"compilerOptions": {\n    "declaration": true,');
    }

    // Ensure noEmit is false or removed
    updated = updated.replace(/"noEmit":\s*true/g, '"noEmit": false');

    // Remove incremental if it conflicts (composite implies incremental)
    updated = updated.replace(/"incremental":\s*false/g, '"incremental": true');

    // Enforce Node16 defaults by removing legacy overrides
    updated = updated.replace(/"moduleResolution":\s*"[^"]*",?/g, '');
    updated = updated.replace(/"module":\s*"[^"]*",?/g, '');
    updated = updated.replace(/"target":\s*"[^"]*",?/g, '');
    updated = updated.replace(/"baseUrl":\s*"[^"]*",?/g, '');
    updated = updated.replace(/"ignoreDeprecations":\s*[^,}]+,?/g, '');

    // Reset paths to standardized workspace mapping
    const isApp = configPath.includes(path.join(root, 'apps'));
    const relativePath = isApp ? '../../packages' : '../';
    // Actually, all apps and packages are 1 level deep from root (packages/x or apps/x)
    // So both need ../../packages mapping relative to their own src if the config is in the package root.
    
    const workspaceMapping = `"paths": {
      "@packages/*": ["../../packages/*/dist/index.d.ts"],
      "@/*": ["./src/*"]
    }`;

    // Overwrite paths block or add it
    const compilerOptionsRegex = /"compilerOptions":\s*{/g;
    if (updated.includes('"paths"')) {
       updated = updated.replace(/"paths":\s*{[^}]*}/g, workspaceMapping);
    } else {
       updated = updated.replace(compilerOptionsRegex, `"compilerOptions": {\n    ${workspaceMapping},`);
    }

    // Ensure extends is present
    if (!updated.includes('"extends"')) {
       updated = updated.replace('{', `{\n    "extends": "${path.join(path.relative(path.dirname(configPath), root), 'tsconfig.base.json').replace(/\\/g, '/')}",`);
    }

    // Ensure ignoreDeprecations is set to silence baseUrl warnings
    if (!updated.includes('"ignoreDeprecations"')) {
       updated = updated.replace('"compilerOptions": {', '"compilerOptions": {\n    "ignoreDeprecations": "6.0",');
    }

    // Ensure baseUrl is set so paths work
    if (!updated.includes('"baseUrl"')) {
       updated = updated.replace(compilerOptionsRegex, '"compilerOptions": {\n    "baseUrl": ".",');
    }

    // Cleanup trailing commas that might be left behind
    updated = updated.replace(/,\s*}/g, '\n  }');
    updated = updated.replace(/\{\s*,/g, '{');

    fs.writeFileSync(configPath, updated);
  } catch (err) {
    console.error(`Error processing ${configPath}:`, err.message);
  }
});

console.log('Done standardizing tsconfigs.');
