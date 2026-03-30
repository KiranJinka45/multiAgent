import fs from 'fs/promises';
import path from 'path';

const WORKSPACES = [
  path.resolve(process.cwd(), 'packages'),
  path.resolve(process.cwd(), 'apps')
];

async function processTsupFile(tsupPath, dirName) {
  if (await fs.stat(tsupPath).catch(() => false)) {
    let tsupContent = await fs.readFile(tsupPath, 'utf8');
    let modified = false;

    // Fix module.exports for ESM migration
    if (tsupContent.includes("module.exports = ")) {
      tsupContent = tsupContent.replace(/module\.exports\s*=\s*/g, "export default ");
      modified = true;
    }

    if (modified) {
      await fs.writeFile(tsupPath, tsupContent, 'utf8');
      console.log(`Updated export syntax ${path.basename(tsupPath)}: ${dirName}`);
    }
  }
}

async function processWorkspace(baseDir) {
  if (!(await fs.stat(baseDir).catch(() => false))) return;

  const dirs = await fs.readdir(baseDir, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    
    await processTsupFile(path.join(baseDir, dir.name, 'tsup.config.ts'), dir.name);
    await processTsupFile(path.join(baseDir, dir.name, 'tsup.config.js'), dir.name);
    await processTsupFile(path.join(baseDir, dir.name, 'tsup.config.mjs'), dir.name);
  }
}

async function main() {
  for (const w of WORKSPACES) {
    await processWorkspace(w);
  }
}

main();
