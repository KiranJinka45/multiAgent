import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const TARGET_DIRS = ['apps', 'packages'];

function fixPackage(pkgPath) {
    if (!fs.existsSync(pkgPath)) return;
    
    console.log(`[FIX] Checking ${pkgPath}`);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;

    const dir = path.dirname(pkgPath);
    const hasIndexTs = fs.existsSync(path.join(dir, 'src', 'index.ts'));

    if (pkg.scripts) {
        // Force update build/dev scripts to standard form
        const newBuild = hasIndexTs ? 'tsup src/index.ts --no-dts && tsc --emitDeclarationOnly' : 'tsup --no-dts && tsc --emitDeclarationOnly';
        const newDev = hasIndexTs ? 'tsup src/index.ts --no-dts --watch' : 'tsup --no-dts --watch';
        
        if (pkg.scripts.build !== newBuild) {
            pkg.scripts.build = newBuild;
            changed = true;
        }
        if (pkg.scripts.dev !== newDev) {
            pkg.scripts.dev = newDev;
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`[FIX] Updated package.json: ${pkgPath}`);
    }

    const tsconfigPath = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
        try {
            let content = fs.readFileSync(tsconfigPath, 'utf8');
            content = content.replace(/"composite":\s*true/g, '"composite": false');
            content = content.replace(/"incremental":\s*true/g, '"incremental": false');
            content = content.replace(/"references":\s*\[[\s\S]*?\],?/g, '');
            content = content.replace(/,(\s*\})/g, '$1');
            fs.writeFileSync(tsconfigPath, content);
            console.log(`[FIX] Updated tsconfig.json: ${tsconfigPath}`);
        } catch (e) {}
    }

    const tsupPath = path.join(dir, 'tsup.config.ts');
    if (fs.existsSync(tsupPath)) {
        try {
            let content = fs.readFileSync(tsupPath, 'utf8');
            if (!content.includes('external:')) {
                content = content.replace(/defineConfig\(\{/, 'defineConfig({\n  external: [/^@packages\\/.*/],');
            } else if (!content.includes('/^@packages\\/.*/')) {
                content = content.replace(/external:\s*\[/, 'external: [/^@packages\\/.*/, ');
            }
            fs.writeFileSync(tsupPath, content);
            console.log(`[FIX] Updated tsup.config.ts: ${tsupPath}`);
        } catch (e) {}
    }
}

for (const dir of TARGET_DIRS) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            fixPackage(path.join(dirPath, entry.name, 'package.json'));
        }
    }
}

console.log('✅ Global build stabilization complete.');
