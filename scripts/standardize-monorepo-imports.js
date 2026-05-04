const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = [
    { from: /@\/lib\//g, to: '@lib/' },
    { from: /@\/hooks\//g, to: '@hooks/' },
    { from: /@\/config\//g, to: '@config/' },
    { from: /@\/types\//g, to: '@shared-types/' },
    { from: /@\/context\//g, to: '@context/' },
    { from: /@\/components\//g, to: '@components/' },
    { from: /@\/services\//g, to: '@services/' },
    { from: /@\/shared-types/g, to: '@shared-types' }
];

const files = glob.sync('{apps,libs,scripts}/**/*.{ts,tsx,js,jsx}', {
    ignore: ['**/node_modules/**', '**/.next/**']
});

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    replacements.forEach(r => {
        if (r.from.test(content)) {
            content = content.replace(r.from, r.to);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
    }
});
