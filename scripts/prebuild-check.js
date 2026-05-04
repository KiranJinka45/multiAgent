const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const srcDir = path.join(projectRoot, "src");

function findFiles(dir, results = []) {
    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
            findFiles(full, results);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            results.push(full);
        }
    });

    return results;
}

function validateImports(files) {
    let errors = [];

    files.forEach(file => {
        const content = fs.readFileSync(file, "utf8");
        const matches = content.match(/from ["'](.*?)["']/g);

        if (!matches) return;

        matches.forEach(match => {
            const importPath = match
                .replace("from", "")
                .replace(/["']/g, "")
                .trim();

            // Only checking relative imports for this basic validation
            if (importPath.startsWith(".")) {
                const resolved = path.resolve(path.dirname(file), importPath);

                if (
                    !fs.existsSync(resolved + ".ts") &&
                    !fs.existsSync(resolved + ".tsx") &&
                    !fs.existsSync(resolved + "/index.ts") &&
                    !fs.existsSync(resolved + "/index.tsx") &&
                    !fs.existsSync(resolved + ".js") &&
                    !fs.existsSync(resolved + ".jsx")
                ) {
                    errors.push(`Missing file referenced in ${file}: ${importPath}`);
                }
            }
        });
    });

    return errors;
}

const files = findFiles(srcDir);
const errors = validateImports(files);

if (errors.length > 0) {
    fs.writeFileSync("tmp_errors.json", JSON.stringify(errors, null, 2));
    console.error("\nBUILD VALIDATION FAILED - Broken Imports Detected:\n");
    errors.forEach(e => console.error(`  ❌ ${e}`));
    process.exit(1);
}

console.log("✅ Prebuild validation passed: No broken relative imports found.");
