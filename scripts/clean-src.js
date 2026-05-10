import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TARGET_DIRS = ['apps', 'packages'];
const EXTENSIONS_TO_REMOVE = ['.d.ts', '.d.ts.map', '.tsbuildinfo'];

function cleanDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // Only recurse into 'src' or continue if already in 'src'
            if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo') continue;
            cleanDir(fullPath);
        } else {
            const ext = entry.name.endsWith('.d.ts.map') ? '.d.ts.map' : path.extname(entry.name);
            
            if (EXTENSIONS_TO_REMOVE.includes(ext) || entry.name === 'tsconfig.tsbuildinfo') {
                console.log(`[CLEAN] Removing ${fullPath}`);
                fs.unlinkSync(fullPath);
            }
            
            // Special case for .js files in src that have a corresponding .ts file
            if (ext === '.js' && dirPath.includes(path.sep + 'src')) {
                const tsFile = fullPath.replace(/\.js$/, '.ts');
                if (fs.existsSync(tsFile)) {
                    console.log(`[CLEAN] Removing ghost JS file: ${fullPath}`);
                    fs.unlinkSync(fullPath);
                }
            }
        }
    }
}

console.log('🧹 Starting cleanup of ghost build artifacts in src directories...');

for (const dir of TARGET_DIRS) {
    const targetPath = path.join(rootDir, dir);
    cleanDir(targetPath);
}

console.log('✅ Ghost artifact cleanup complete.');
