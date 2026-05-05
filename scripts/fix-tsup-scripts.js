const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const appsDir = path.join(__dirname, '../apps');

function updatePackageJson(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === 'dist') continue;
            updatePackageJson(fullPath);
        } else if (file === 'package.json') {
            let content = fs.readFileSync(fullPath, 'utf8');
            const pkg = JSON.parse(content);
            let changed = false;

            if (pkg.scripts && pkg.scripts.build && (pkg.scripts.build.includes('tsup') || pkg.scripts.build.includes('turbo'))) {
                console.log(`Updating build script in ${fullPath}`);
                pkg.scripts.build = "node ../../node_modules/tsup/dist/cli-default.js src/index.ts --format cjs,esm --no-dts";
                changed = true;
            }
            if (pkg.scripts && pkg.scripts.dev && pkg.scripts.dev.includes('tsup')) {
                console.log(`Updating dev script in ${fullPath}`);
                pkg.scripts.dev = "node ../../node_modules/tsup/dist/cli-default.js src/index.ts --format cjs,esm --no-dts --watch";
                changed = true;
            }

            if (changed) {
                fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2));
            }
        }
    }
}

updatePackageJson(packagesDir);
updatePackageJson(appsDir);
console.log('Finished updating package.json files');
