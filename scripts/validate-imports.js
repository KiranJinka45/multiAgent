const fs = require("fs")
const path = require("path")

const ALIASES = {
    "@/": "src/",
    "@services/": "services/",
    "@workers/": "workers/",
    "@queue/": "queue/",
    "@realtime/": "realtime/",
    "@configs/": "configs/",
    "@templates/": "templates/",
    "@shared-types/": "types/",
    "@runtime/": "services/runtime/",
    "@services/engines/": "services/engines/",
    "@services/agent-intelligence/": "services/agent-intelligence/",
    "@services/learning/": "services/learning/"
}

function checkImports(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)

    files.forEach(file => {
        const full = path.join(dir, file)

        if (fs.statSync(full).isDirectory()) {
            if (file !== "node_modules" && file !== ".next" && file !== ".git") {
                checkImports(full)
            }
        } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            const content = fs.readFileSync(full, "utf8")
            // Match top-level import/export statements
            const importRegex = /^(import|export) .*? from ["'](.*?)["']/gm
            let match
            while ((match = importRegex.exec(content)) !== null) {
                let importPath = match[2]
                let resolvedPath = null

                // Resolve aliases
                for (const [alias, target] of Object.entries(ALIASES)) {
                    if (importPath.startsWith(alias)) {
                        resolvedPath = path.resolve(process.cwd(), importPath.replace(alias, target))
                        break
                    }
                }

                // Resolve relative paths
                if (!resolvedPath && importPath.startsWith(".")) {
                    resolvedPath = path.resolve(path.dirname(full), importPath)
                }

                if (resolvedPath) {
                    // Check for .ts or .tsx (Next.js/TS might not have extensions in imports)
                    const possiblePaths = [
                        resolvedPath,
                        resolvedPath + ".ts",
                        resolvedPath + ".tsx",
                        path.join(resolvedPath, "index.ts"),
                        path.join(resolvedPath, "index.tsx")
                    ]

                    const exists = possiblePaths.some(p => fs.existsSync(p))
                    if (!exists) {
                        console.error(`❌ BROKEN IMPORT in ${path.relative(process.cwd(), full)}:`);
                        console.error(`   Path: "${importPath}"`);
                        console.error(`   Search attempts: ${possiblePaths.map(p => path.relative(process.cwd(), p)).join(", ")}`);
                        process.exitCode = 1
                    }
                }
            }
        }
    })
}

console.log("🔍 Validating imports across the codebase...")
const dirsToScan = ["src", "services", "workers", "queue", "realtime", "configs"]
dirsToScan.forEach(dir => checkImports(path.resolve(process.cwd(), dir)))

if (process.exitCode === 1) {
    console.log("\n❌ Validation failed. Please fix the broken imports listed above.")
} else {
    console.log("\n✅ All imports validated successfully!")
}
