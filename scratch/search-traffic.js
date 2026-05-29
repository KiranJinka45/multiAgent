import fs from 'fs';
const content = fs.readFileSync('scripts/run-stateful-chaos-soak.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('tier') || line.includes('drill/trigger') || line.includes('drill/resolve')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
