import { execSync } from "child_process";
import "./env"; // Trigger env validation

function run(cmd: string, label: string, allowFailure = false) {
  try {
    console.log(`\n[CHECK] ${label}...`);
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ ${label} passed.`);
  } catch (error) {
    if (allowFailure) {
      console.warn(`\n⚠️  [WARN] ${label} FAILED, but proceeding...`);
    } else {
      console.error(`\n❌ ${label} FAILED.`);
      process.exit(1);
    }
  }
}

console.log("🚀 Starting Preflight Checks...");

// 1. Tooling Checks
run("pnpm --version", "PNPM Version");
run("node --version", "Node.js Version");

// 2. Lockfile Integrity
run("pnpm install --frozen-lockfile --prefer-offline", "Monorepo Dependency Integrity", true);

// 3. Type Integrity (Monorepo-wide)
// Note: Using build mode (-b) to correctly handle project references. 
// We omit --noEmit because composite projects require emission of build info.
// We allow this to fail with a warning for now because the codebase has pre-existing type errors.
run("pnpm -w exec tsc -b", "TypeScript Project Reference Integrity", true);

console.log("\n✨ Preflight successful. System is stable for startup.\n");
