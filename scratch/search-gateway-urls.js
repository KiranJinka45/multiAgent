import fs from 'fs';
const content = fs.readFileSync('apps/gateway/src/server.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('URL') || line.includes('target') || line.includes(':3')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
