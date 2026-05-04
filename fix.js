const fs = require('fs');
const lines = fs.readFileSync('apps/gateway/src/index.ts', 'utf8').split('\n');
lines.splice(468, 198, "        import('@packages/memory-cache'),", "        import('@packages/utils'),");
fs.writeFileSync('apps/gateway/src/index.ts', lines.join('\n'));
