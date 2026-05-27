import fs from 'fs';
import path from 'path';

const SRC_DIR = 'c:/multiagentic_project/multiAgent-main/apps/core-api/src';

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (stat.isFile() && filepath.endsWith('.ts') && !filepath.endsWith('.d.ts')) {
      callback(filepath);
    }
  }
}

function processFile(filepath) {
  console.log(`Processing file: ${filepath}`);
  let content = fs.readFileSync(filepath, 'utf8');
  const dirOfFile = path.dirname(filepath);

  // Regex to match imports/exports
  // e.g. import ... from './foo';
  // e.g. import './foo';
  // e.g. export ... from './foo';
  // Group 1: prefix (import/export stuff)
  // Group 2: Quote character (' or ")
  // Group 3: Import path
  const importRegex = /(import\s+[\s\S]*?\s+from\s+|import\s+|export\s+[\s\S]*?\s+from\s+)(['"])([^'"]+)\2/g;

  let modified = false;
  const newContent = content.replace(importRegex, (match, prefix, quote, importPath) => {
    // Only process relative paths
    if (!importPath.startsWith('.') && !importPath.startsWith('..')) {
      return match;
    }

    // Skip if it already has an extension
    const ext = path.extname(importPath);
    if (ext === '.js' || ext === '.json' || ext === '.css' || ext === '.wasm') {
      return match;
    }

    // Determine target path on disk
    let targetPath = path.resolve(dirOfFile, importPath);
    let resolvedPath = null;

    if (fs.existsSync(targetPath + '.ts')) {
      resolvedPath = importPath + '.js';
    } else if (fs.existsSync(targetPath + '/index.ts')) {
      resolvedPath = importPath + '/index.js';
    } else if (fs.existsSync(targetPath + '.js')) {
      resolvedPath = importPath + '.js';
    } else if (fs.existsSync(targetPath + '/index.js')) {
      resolvedPath = importPath + '/index.js';
    } else {
      // Fallback: just append .js
      resolvedPath = importPath + '.js';
    }

    if (resolvedPath !== importPath) {
      console.log(`  Updating import: "${importPath}" -> "${resolvedPath}"`);
      modified = true;
      // Standardize to forward slashes for ES imports
      const normalizedPath = resolvedPath.replace(/\\/g, '/');
      return `${prefix}${quote}${normalizedPath}${quote}`;
    }

    return match;
  });

  if (modified) {
    fs.writeFileSync(filepath, newContent, 'utf8');
    console.log(`  Saved modified file.`);
  }
}

walkDir(SRC_DIR, processFile);
console.log('Codemod completed successfully.');
