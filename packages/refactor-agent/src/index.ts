import fs from 'fs-extra';
import path from 'path';
import { applyFixes } from './fixer';

export * from './fixer';

export async function walkAndFix(dir: string) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.turbo'].includes(file)) continue;
      await walkAndFix(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const fixed = await applyFixes(fullPath);
      if (fixed) console.log(`Refactor Agent fixed: ${fullPath}`);
    }
  }
}

export async function main() {
  console.log('🚀 AI Auto-Refactor Agent starting...');
  const roots = ['apps', 'packages'];
  for (const root of roots) {
    if (await fs.pathExists(root)) {
      await walkAndFix(root);
    }
  }
  console.log('✅ Refactor run complete.');
}

if (require.main === module) {
  main().catch(console.error);
}

