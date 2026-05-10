import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = __dirname;

const EXTENSIONS_TO_CHECK = ['.js', '.d.ts', '.js.map'];

function cleanScripts() {
    console.log(`🧹 Cleaning up generated artifacts in ${scriptsDir}...`);
    
    const entries = fs.readdirSync(scriptsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) continue;

        const name = entry.name;
        let base = '';
        let matchedExt = '';

        for (const ext of EXTENSIONS_TO_CHECK) {
            if (name.endsWith(ext)) {
                base = name.slice(0, -ext.length);
                matchedExt = ext;
                break;
            }
        }

        if (base) {
            const tsFile = path.join(scriptsDir, `${base}.ts`);
            if (fs.existsSync(tsFile)) {
                const fullPath = path.join(scriptsDir, name);
                console.log(`[CLEAN] Removing generated script artifact: ${name}`);
                fs.unlinkSync(fullPath);
            }
        }
    }
    
    console.log('✅ Scripts cleanup complete.');
}

cleanScripts();
