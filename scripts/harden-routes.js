const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else {
      if (file.endsWith('route.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const apiDir = path.join(process.cwd(), 'apps/web/app/api');
const files = getFiles(apiDir);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes("export const dynamic = 'force-dynamic'") && !content.includes('export const dynamic = "force-dynamic"')) {
    console.log(`Hardening: ${file}`);
    fs.appendFileSync(file, "\nexport const dynamic = 'force-dynamic';\n");
  } else {
    console.log(`Already hardened: ${file}`);
  }
});
