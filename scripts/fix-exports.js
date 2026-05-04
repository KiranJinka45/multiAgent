const fs = require('fs');
const path = require('path');

const packages = fs.readdirSync('packages');

packages.forEach(pkg => {
    const pkgPath = path.join('packages', pkg, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const j = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (j.exports && j.exports['.']) {
                // 'types' MUST come first to avoid shadowing by 'import' or 'require' in Node 20
                j.exports['.'] = {
                    types: './dist/index.d.ts',
                    import: './dist/index.mjs',
                    require: './dist/index.js'
                };
                fs.writeFileSync(pkgPath, JSON.stringify(j, null, 2));
                console.log(`Updated exports for ${pkg}`);
            }
        } catch (e) {
            console.error(`Failed to update ${pkg}: ${e.message}`);
        }
    }
});
