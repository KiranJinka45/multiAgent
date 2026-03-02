const fs = require('fs');
const content = fs.readFileSync('lint_ext.txt', 'utf16le');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Error:') || lines[i].includes('Warning:')) {
        console.log(lines[i - 1]);
        console.log(lines[i]);
    }
}
