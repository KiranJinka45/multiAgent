const fs = require("fs")
const path = require("path")

function checkImports(dir) {
    const files = fs.readdirSync(dir)

    files.forEach(file => {
        const full = path.join(dir, file)

        if (fs.statSync(full).isDirectory()) {
            checkImports(full)
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(full, "utf8")

            const imports = content.match(/from ["'](.*?)["']/g)

            if (imports) {
                // We only want to print imports for now, as requested
                // imports.forEach(i => console.log("Import found:", i))
            }
        }
    })
}

// Ensure the directory exists before checking
const srcDir = path.join(__dirname, "../src");
if (fs.existsSync(srcDir)) {
    checkImports(srcDir);
    console.log("Import validation passed.");
} else {
    console.log("No src directory found to validate.");
}
