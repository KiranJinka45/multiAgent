import fs from 'fs';
import path from 'path';

function standardizeTSConfig(dir: string) {
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) return;

    let lines = fs.readFileSync(tsconfigPath, 'utf8').split('\n');
    // Remove lines starting with //
    const filteredLines = lines.filter(line => !line.trim().startsWith('//'));
    let tsconfig = JSON.parse(filteredLines.join('\n'));
    
    // Extend base
    tsconfig.extends = "../../tsconfig.base.json";
    
    // Ensure outDir is dist
    if (tsconfig.compilerOptions) {
        tsconfig.compilerOptions.outDir = "dist";
    }

    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
    console.log(`✅ Standardized tsconfig in ${path.basename(dir)}`);
}

const APPS_DIR = path.resolve('apps');
const PKGS_DIR = path.resolve('packages');

fs.readdirSync(APPS_DIR).forEach(d => standardizeTSConfig(path.join(APPS_DIR, d)));
fs.readdirSync(PKGS_DIR).forEach(d => standardizeTSConfig(path.join(PKGS_DIR, d)));
