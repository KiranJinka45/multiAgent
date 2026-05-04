const fs = require('fs');
const path = require('path');

const pkgsDir = path.join(process.cwd(), 'packages');
const packages = fs.readdirSync(pkgsDir).filter(f => fs.statSync(path.join(pkgsDir, f)).isDirectory());

for (const pkg of packages) {
  const pkgJsonPath = path.join(pkgsDir, pkg, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    let pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    
    // Set standard source exports
    const exportsObj = {
      ".": "./src/index.ts",
    };
    
    if (fs.existsSync(path.join(pkgsDir, pkg, 'src', 'server'))) {
      exportsObj["./server"] = "./src/server/index.ts";
    }
    if (fs.existsSync(path.join(pkgsDir, pkg, 'src', 'client'))) {
      exportsObj["./client"] = "./src/client/index.ts";
    }
    // Specific for utils: see if there's config
    if (fs.existsSync(path.join(pkgsDir, pkg, 'src', 'config'))) {
      exportsObj["./config"] = "./src/config/index.ts";
    }
    
    pkgJson.exports = exportsObj;
    
    // Clean legacy compiled pointers
    delete pkgJson.main;
    delete pkgJson.module;
    delete pkgJson.types;
    
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
    console.log(`Fixed exports for @packages/${pkg}`);
  }
}
