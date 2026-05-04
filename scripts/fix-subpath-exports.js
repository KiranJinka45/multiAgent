const fs = require('fs');
const path = require('path');

const packages = fs.readdirSync('packages');

packages.forEach(pkg => {
    const pkgPath = path.join('packages', pkg, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const j = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (j.exports) {
                // Ensure types are handled correctly for wildcard exports too
                j.exports['./*'] = {
                    types: './dist/*.d.ts',
                    import: './dist/*.mjs',
                    require: './dist/*.js'
                };
                fs.writeFileSync(pkgPath, JSON.stringify(j, null, 2));
                console.log(`Updated sub-path exports for ${pkg}`);
            }
        } catch (e) {
            console.error(`Failed to update ${pkg}: ${e.message}`);
        }
    }
});
