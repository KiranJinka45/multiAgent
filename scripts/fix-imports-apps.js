const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, callback);
        } else if (filePath.endsWith('.ts')) {
            callback(filePath);
        }
    });
}

['apps/worker/src', 'apps/api/src'].forEach(dir => {
    if (fs.existsSync(dir)) {
        walk(dir, (f) => {
            let content = fs.readFileSync(f, 'utf8');
            // Replace e.g. '../../packages/utils' or '../@libs/utils' with '@libs/utils'
            // Regex to catch both legacy and partially refactored imports
            content = content.replace(/from\s+['\"](?:\.\.?\/)*(?:packages\/|@libs\/)([^'\"]+)['\"]/g, "from '@libs/$1'");
            fs.writeFileSync(f, content);
            console.log(`Cleaned ${f}`);
        });
    }
});
