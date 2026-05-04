import fs from 'fs';
import path from 'path';

function standardizePackage(dir: string, type: 'app' | 'lib') {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    // Skip Next.js apps based on dev script
    if (pkg.scripts && pkg.scripts.dev && pkg.scripts.dev.includes('next dev')) {
        console.log(`⏩ Skipping Next.js app: ${pkg.name}`);
        return;
    }
    
    // Standardize Scripts
    pkg.scripts = pkg.scripts || {};
    pkg.scripts.build = "tsup";
    
    if (type === 'app') {
        pkg.scripts.dev = 'tsup --watch --onSuccess "node dist/index.js"';
    } else {
        pkg.scripts.dev = "tsup --watch";
    }

    pkg.scripts.lint = "eslint .";
    pkg.scripts.typecheck = "tsc --noEmit";

    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`✅ Standardized ${pkg.name}`);
}

const APPS_DIR = path.resolve('apps');
const PKGS_DIR = path.resolve('packages');

fs.readdirSync(APPS_DIR).forEach(d => standardizePackage(path.join(APPS_DIR, d), 'app'));
fs.readdirSync(PKGS_DIR).forEach(d => standardizePackage(path.join(PKGS_DIR, d), 'lib'));

