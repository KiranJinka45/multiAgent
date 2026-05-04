import { execSync } from 'child_process';

const ports = [3007, 4081, 4002, 8082, 3002, 4005, 3010, 3500, 3011, 4200];

console.log('🧹 Cleaning up ghost processes...');

for (const port of ports) {
  try {
    // Windows command to find PID on port and kill it
    const output = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = output.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 4) {
        const pid = parts[parts.length - 1];
        if (pid !== '0') {
          console.log(`Killing process ${pid} on port ${port}...`);
          try {
            execSync(`taskkill /F /PID ${pid}`);
          } catch (e) {
            // Might be already dead
          }
        }
      }
    }
  } catch (e) {
    // No process on this port
  }
}

console.log('✅ Cleanup complete.');
process.exit(0);


