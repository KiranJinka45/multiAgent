const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const missingFile = path.join(projectRoot, "src/lib/project-service.ts");
const libDir = path.join(projectRoot, "src/lib");

// Ensure src/lib exists
if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
}

if (!fs.existsSync(missingFile)) {
    console.log("⚠️ Creating missing project-service.ts to satisfy imports...");

    fs.writeFileSync(
        missingFile,
        `// Auto-generated fallback to prevent build failures
export async function getProject() {
  return null;
}
`
    );
    console.log("✅ Created fallback file.");
} else {
    console.log("✅ Required fallback files already exist.");
}
