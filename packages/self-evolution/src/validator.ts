import { execSync } from "child_process";

export function validateSystem(): boolean {
  try {
    console.log("🔍 Running system validation (lint)...");
    execSync("pnpm lint", { stdio: "inherit", cwd: process.cwd() });
    
    console.log("🏗️ Running system validation (build)...");
    execSync("pnpm build", { stdio: "inherit", cwd: process.cwd() });
    
    return true;
  } catch (error) {
    console.error("❌ System validation failed.");
    return false;
  }
}

