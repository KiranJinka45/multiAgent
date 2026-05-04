/**
 * Migration script: Redirects all `logger` imports from @packages/utils
 * to @packages/observability across the sandbox-runtime package.
 */
const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'packages/sandbox-runtime/src',
  'packages/core-engine/src',
  'packages/brain/src',
  'packages/agents/src',
  'packages/memory/src',
  'packages/sandbox/src',
  'apps/api/src',
  'apps/worker/src',
  'apps/core-api/src',
  'apps/gateway/src',
];

let fixedCount = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      processFile(full);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Pattern 1: import { logger } from '@packages/utils';
  // Replace entirely with observability import
  content = content.replace(
    /import\s*\{\s*logger\s*\}\s*from\s*'@packages\/utils';/g,
    "import { logger } from '@packages/observability';"
  );

  // Pattern 2: import { ..., logger, ... } from '@packages/utils';
  // Remove logger from the destructure and add separate import
  const mixedPattern = /import\s*\{([^}]*)\blogger\b([^}]*)\}\s*from\s*'@packages\/utils';/g;
  let match;
  while ((match = mixedPattern.exec(content)) !== null) {
    const before = match[1];
    const after = match[2];
    
    // Remove logger and clean up commas
    let remaining = (before + after)
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s !== 'logger')
      .join(', ');
    
    let replacement = '';
    if (remaining) {
      replacement = `import { ${remaining} } from '@packages/utils';\nimport { logger } from '@packages/observability';`;
    } else {
      replacement = `import { logger } from '@packages/observability';`;
    }
    
    content = content.replace(match[0], replacement);
    // Reset regex state since we modified the string
    mixedPattern.lastIndex = 0;
  }

  if (content !== original) {
    // Ensure no duplicate observability imports
    const lines = content.split('\n');
    const seen = new Set();
    const deduped = lines.filter(line => {
      const trimmed = line.trim();
      if (trimmed === "import { logger } from '@packages/observability';") {
        if (seen.has(trimmed)) return false;
        seen.add(trimmed);
      }
      return true;
    });
    content = deduped.join('\n');

    fs.writeFileSync(filePath, content, 'utf-8');
    fixedCount++;
    console.log(`✅ Fixed: ${filePath}`);
  }
}

for (const dir of TARGET_DIRS) {
  walk(path.join(__dirname, dir));
}

console.log(`\n🏁 Done. Fixed ${fixedCount} files.`);
