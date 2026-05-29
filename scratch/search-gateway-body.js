import fs from 'fs';
const content = fs.readFileSync('apps/gateway/src/server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('json()') || line.includes('bodyParser') || line.includes('urlencoded')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
