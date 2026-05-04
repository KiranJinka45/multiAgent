const fs = require("fs")
const path = require("path")
const glob = require("glob")

const files = glob.sync("{src,shared,workers,runtime,api-gateway}/**/*.{ts,tsx,js,jsx}")

let broken = []

files.forEach(file => {
    const content = fs.readFileSync(file, "utf8")
    const matches = content.match(/from ["'](.*?)["']/g)

    if (!matches) return

    matches.forEach(match => {
        const importPath = match
            .replace("from", "")
            .replace(/["']/g, "")
            .trim()

        if (importPath.startsWith(".")) {
            const resolved = path.resolve(path.dirname(file), importPath)

            const exists =
                fs.existsSync(resolved + ".ts") ||
                fs.existsSync(resolved + ".tsx") ||
                fs.existsSync(resolved + "/index.ts") ||
                fs.existsSync(resolved + "/index.tsx")

            if (!exists) {
                broken.push({
                    file,
                    importPath
                })
            }
        }
    })
})

if (broken.length === 0) {
    console.log("No broken imports detected")
} else {
    console.log("\nBroken Imports Found:\n")
    broken.forEach(b => {
        console.log(`File: ${b.file}`)
        console.log(`Missing: ${b.importPath}\n`)
    })
    process.exit(1)
}
