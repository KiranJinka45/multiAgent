import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m'; // No Color

console.log(`${BLUE}====================================================${NC}`);
console.log(`${BLUE}   ZTAN PHASE 27 NATIVE HARDWARE RUNNER            ${NC}`);
console.log(`${BLUE}====================================================${NC}\n`);

// 1. Run Preflight Check
console.log('Running hardware preflight script...');
try {
  // Try running the bash script
  execSync('bash scripts/hardware-preflight.sh', { stdio: 'inherit' });
} catch {
  console.log(`\n${RED}⚠️  Preflight checker reported critical failures.${NC}`);
}

// 2. Verify ZTAN Workspace & Files
console.log('\nChecking ZTAN microVM workspace (/var/lib/ztan/)...');
const kernelPath = '/var/lib/ztan/vmlinux';
const rootfsPath = '/var/lib/ztan/rootfs';

let workspaceReady = true;

if (!fs.existsSync(kernelPath)) {
  console.log(`${YELLOW}⚠️  Validation Kernel missing at ${kernelPath}${NC}`);
  console.log(`   To download: sudo curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/hello/ubuntu/kernel/vmlinux.bin -o ${kernelPath}`);
  workspaceReady = false;
} else {
  console.log(`${GREEN}✓ Kernel found at ${kernelPath}${NC}`);
}

if (!fs.existsSync(rootfsPath)) {
  console.log(`${YELLOW}⚠️  Validation RootFS missing at ${rootfsPath}${NC}`);
  console.log(`   To download: sudo curl -fsSL https://s3.amazonaws.com/spec.ccfc.min/img/hello/ubuntu/fsfiles/hello-rootfs.ext4 -o ${rootfsPath}`);
  workspaceReady = false;
} else {
  console.log(`${GREEN}✓ RootFS found at ${rootfsPath}${NC}`);
}

// 3. Verify tap0 configuration
console.log('\nChecking Network TAP interface (tap0)...');
try {
  const ipLinkOutput = execSync('ip link show tap0', { stdio: 'pipe', encoding: 'utf8' });
  if (ipLinkOutput.includes('tap0')) {
    console.log(`${GREEN}✓ Network interface tap0 is configured.${NC}`);
  }
} catch {
  console.log(`${YELLOW}⚠️  tap0 device is not configured on this host.${NC}`);
  console.log(`   To configure:`);
  console.log(`   sudo ip tuntap add tap0 mode tap`);
  console.log(`   sudo ip addr add 172.16.0.1/24 dev tap0`);
  console.log(`   sudo ip link set tap0 up`);
}

// 4. Run the validation certifier
console.log('\nExecuting ZTAN hardware validation certifier...');
const certifierScript = 'scripts/validate-physical-hardware.ts';

if (!fs.existsSync(certifierScript)) {
  console.log(`${RED}❌ Error: Certifier script ${certifierScript} not found.${NC}`);
  process.exit(1);
}

try {
  console.log(`Executing: npx tsx ${certifierScript}`);
  execSync(`npx tsx ${certifierScript}`, { stdio: 'inherit' });
  
  // Verify deliverables exist
  const attestationPath = path.join(process.cwd(), 'physical-attestation-evidence.json');
  const certPath = path.join(process.cwd(), 'PHYSICAL_HARDWARE_CERTIFICATION.md');
  
  if (fs.existsSync(attestationPath) && fs.existsSync(certPath)) {
    console.log(`\n${GREEN}✅ Success! Validation deliverables generated successfully:${NC}`);
    console.log(`   * physical-attestation-evidence.json`);
    console.log(`   * PHYSICAL_HARDWARE_CERTIFICATION.md`);
  } else {
    console.log(`\n${RED}❌ Error: Deliverables not found after validation execution.${NC}`);
  }
} catch (err: any) {
  console.log(`\n${RED}❌ Error running ZTAN validation certifier: ${err.message}${NC}`);
  process.exit(1);
}
