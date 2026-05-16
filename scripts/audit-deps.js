import fs from 'fs';
import path from 'path';

const packagesDir = 'packages';
const alivePackages = fs.readdirSync(packagesDir).filter(f => fs.statSync(path.join(packagesDir, f)).isDirectory());
// Also check if package.json exists in those dirs
const verifiedPackages = alivePackages.filter(p => fs.existsSync(path.join(packagesDir, p, 'package.json')));

console.log('Alive verified packages:', verifiedPackages);

function auditDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules') continue;
            auditDir(fullPath);
        } else if (file === 'package.json') {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            const deps = { ...content.dependencies, ...content.devDependencies };
            for (const dep in deps) {
                if (dep.startsWith('@packages/')) {
                    const pkgName = dep.replace('@packages/', '');
                    if (!verifiedPackages.includes(pkgName)) {
                        console.log(`[AUDIT] Missing dependency: ${dep} in ${fullPath}`);
                    }
                }
            }
        }
    }
}

console.log('Auditing apps...');
auditDir('apps');
console.log('Auditing packages...');
auditDir('packages');
