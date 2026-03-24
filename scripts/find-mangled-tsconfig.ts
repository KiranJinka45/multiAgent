import fs from 'fs';
import path from 'path';

function findMangled(dir: string) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) return;

    try {
        let content = fs.readFileSync(tsconfigPath, 'utf8');
        // Basic comment stripping (safe line-based)
        const lines = content.split('\n').filter(line => !line.trim().startsWith('//'));
        JSON.parse(lines.join('\n'));
    } catch (e) {
        console.log(`❌ Mangled: ${tsconfigPath}`);
        console.log(`   Error: ${e.message}`);
        // Read raw to see what's wrong
        console.log(`   Content: ${fs.readFileSync(tsconfigPath, 'utf8').substring(0, 100)}...`);
    }
}

const APPS_DIR = path.resolve('apps');
const PKGS_DIR = path.resolve('packages');

fs.readdirSync(APPS_DIR).forEach(d => findMangled(path.join(APPS_DIR, d)));
fs.readdirSync(PKGS_DIR).forEach(d => findMangled(path.join(PKGS_DIR, d)));
