import fs from "fs";
import path from "path";

const packagesDir = path.join(process.cwd(), "packages");
const appsDir = path.join(process.cwd(), "apps");

function fixTsConfig(dir: string) {
  const tsConfigPath = path.join(dir, "tsconfig.json");
  if (fs.existsSync(tsConfigPath)) {
    console.log(`Fixing ${tsConfigPath}...`);
    const content = fs.readFileSync(tsConfigPath, "utf-8");
    try {
      const json = JSON.parse(content);
      if (json.compilerOptions) {
        json.compilerOptions.noEmit = false;
        fs.writeFileSync(tsConfigPath, JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.error(`Failed to parse ${tsConfigPath}`);
    }
  }
}

// Fix all packages
fs.readdirSync(packagesDir).forEach(pkg => fixTsConfig(path.join(packagesDir, pkg)));
// Fix all apps
fs.readdirSync(appsDir).forEach(app => fixTsConfig(path.join(appsDir, app)));
