const fs = require('fs');
const buffer = fs.readFileSync('package.json');
// Try to detect encoding and convert
let text = '';
if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = buffer.toString('utf16le');
} else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    text = buffer.swap16().toString('utf16le');
} else {
    // Try to strip nulls (common in mis-encoded UTF-16 that looks like ASCII)
    text = buffer.filter(b => b !== 0).toString('utf8');
}
fs.writeFileSync('package_fixed.json', text, 'utf8');
console.log('Converted package.json to package_fixed.json');
