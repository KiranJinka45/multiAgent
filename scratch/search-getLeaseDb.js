import fs from 'fs';
const content = fs.readFileSync('packages/utils/src/governance-ledger.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('getLeaseDb') || line.trim().startsWith('getLeaseDb(')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
