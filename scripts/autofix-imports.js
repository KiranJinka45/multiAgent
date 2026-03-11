const fs = require("fs")
const path = require("path")

const target = path.join(__dirname, "../src/lib/project-service.ts")

if (!fs.existsSync(target)) {
    console.log("Creating missing project-service.ts")

    // Ensure directory exists
    const dir = path.dirname(target)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(target,
        `export function getProject() {
 return null
}
`)
} else {
    console.log("autofix-imports: required files are already present.")
}
