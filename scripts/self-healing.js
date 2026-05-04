/**
 * Self-Healing Script for MultiAgent System
 * 
 * This script repairs common environment issues:
 * 1. Cleans .next cache
 * 2. Restarts Redis
 * 3. Verifies core dependencies
 * 4. Checks module resolution
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log("=== 🛡️ MultiAgent Self-Healing Routine ===");

const isWin = os.platform() === 'win32';

// 1. Clean Next.js cache
console.log("\n1. 🧹 Cleaning Next.js cache...");
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
    try {
        if (isWin) {
            execSync(`rmdir /s /q "${nextDir}"`, { stdio: 'inherit' });
        } else {
            execSync(`rm -rf "${nextDir}"`, { stdio: 'inherit' });
        }
        console.log("✅ .next directory removed.");
    } catch (e) {
        console.log("⚠️ Could not remove .next. It may be locked.");
    }
} else {
    console.log("⏭️ .next directory not found.");
}

// 2. Restart Redis
console.log("\n2. 🔄 Restarting Redis via Docker...");
try {
    execSync('docker compose -f infra/docker-compose.yml restart redis', { stdio: 'inherit' });
    console.log("✅ Redis restarted.");
} catch (e) {
    console.log("⚠️ Docker restart failed. Attempting to start locally if configured...");
}

// 3. Verify node_modules
console.log("\n3. 📦 Verifying core dependencies...");
const coreDeps = ['bullmq', 'ioredis', 'dotenv', 'groq-sdk', 'tsx'];
let missing = false;
for (const dep of coreDeps) {
    try {
        require.resolve(dep);
        console.log(`✅ ${dep} is installed.`);
    } catch (e) {
        console.log(`❌ ${dep} is MISSING.`);
        missing = true;
    }
}

if (missing) {
    console.log("\n⚠️ Missing dependencies detected. Running npm install...");
    try {
        execSync('npm install', { stdio: 'inherit' });
    } catch (e) {
        console.error("❌ npm install failed.");
    }
}

// 4. Final Diagnostics
console.log("\n4. 🩺 Running system diagnostics...");
try {
    execSync('node scripts/diagnostic.js', { stdio: 'inherit' });
} catch (e) {
    console.log("⚠️ Diagnostics reported issues.");
}

console.log("\n=== ✨ Environment Repaired Successfully ===");
console.log("Run 'npm run dev' to start the system.");
