const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== 'dist' && f !== '.git') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(path.join(dir, f));
        }
    });
}

const rootDir = 'C:/multiagentic_project/multiAgent-main';

walkDir(rootDir, (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.json')) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('@runtime')) {
                let newContent = content.replace(/@runtime/g, '@libs/runtime');
                fs.writeFileSync(filePath, newContent);
                console.log(`Updated: ${filePath}`);
            }
        } catch (e) {
            // console.error(`Failed to process ${filePath}: ${e.message}`);
        }
    }
});
