import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';

const PORTS = [4020, 4021, 4022, 5050];

/**
 * Actively probes a port to determine if it is free for binding.
 */
async function waitAndVerifyPortFree(port: number, timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      try {
        server.listen(port, '127.0.0.1');
      } catch {
        resolve(false);
      }
    });

    if (free) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export async function performPreflightCleanup() {
  console.log('🧹 [Preflight Cleanup] Starting deterministic reset...');

  // 1. Kill any active processes on target ports
  for (const port of PORTS) {
    try {
      if (process.platform === 'win32') {
        let output = '';
        try {
          output = execSync(`netstat -ano -p TCP`, { encoding: 'utf8' });
        } catch {
          // ignore
        }
        const lines = output.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split(/\s+/);
          if (parts.length < 5) continue;
          const localAddr = parts[1];
          const state = parts[3];
          const pidStr = parts[4];
          
          const portSuffix = `:${port}`;
          if (!localAddr.endsWith(portSuffix)) continue;
          
          const prefixEnd = localAddr.length - portSuffix.length;
          if (prefixEnd > 0) {
            const charBefore = localAddr[prefixEnd - 1];
            if (charBefore >= '0' && charBefore <= '9') continue;
          }

          if (state !== 'LISTENING' && state !== 'ESTABLISHED') continue;
          
          const pid = parseInt(pidStr, 10);
          if (pid && pid !== process.pid) {
            console.log(`   - Found process ${pid} LISTENING/ESTABLISHED on port ${port}, killing it...`);
            try {
              execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
              console.log(`     ↳ Killed PID ${pid}`);
            } catch (e: any) {
              console.warn(`     ↳ Failed to kill process ${pid}: ${e.message}`);
            }
          }
        }
      } else {
        let output = '';
        try {
          output = execSync(`lsof -t -i:${port}`, { encoding: 'utf8' });
        } catch {
          // ignore
        }
        const pids = output.split('\n').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
        for (const pid of pids) {
          if (pid && pid !== process.pid) {
            console.log(`   - Found process ${pid} on port ${port}, killing it...`);
            try {
              execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            } catch (e: any) {
              console.warn(`     ↳ Failed to kill process ${pid}: ${e.message}`);
            }
          }
        }
      }
    } catch {
      // Port is probably free
    }
  }

  // 2. Actively verify that ports are fully free and released by the kernel
  for (const port of PORTS) {
    console.log(`   - Probing port ${port} socket availability...`);
    const isFree = await waitAndVerifyPortFree(port, 5000);
    if (isFree) {
      console.log(`     ✔ Port ${port} verified free and available.`);
    } else {
      console.warn(`     ⚠️  Port ${port} remains blocked after active bind attempts.`);
    }
  }

  // 3. Lock file and temp dir cleanup
  const dirsToClear = [
    path.join(process.cwd(), '.ztan-transparency'),
    path.join(process.cwd(), '.ztan', 'evidence-vault'),
    path.join(process.cwd(), 'soak-data')
  ];

  for (const dir of dirsToClear) {
    if (fs.existsSync(dir)) {
      try {
        console.log(`   - Purging directory: ${path.relative(process.cwd(), dir)}`);
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (e: any) {
        console.warn(`   - Failed to clear directory ${dir}: ${e.message}`);
      }
    }
  }

  // Remove other ephemeral files
  const filesToClear = [
    path.join(process.cwd(), '.ztan-transparency', 'watchdog_suppression.json'),
    path.join(process.cwd(), '.ztan-transparency', 'liveness.json'),
    path.join(process.cwd(), '.ztan-transparency', 'liveness_partition_0.json'),
    path.join(process.cwd(), '.ztan-transparency', 'ledger.lock')
  ];

  for (const file of filesToClear) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  }

  // 4. Mandate a cooldown period for Windows TCP port recycling
  console.log('⏳ [Preflight Cleanup] Mandating 2-second kernel handle cooldown delay...');
  await new Promise((r) => setTimeout(r, 2000));

  console.log('✔ [Preflight Cleanup] Environment reset cleanly.\n');
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('preflight-cleanup.ts') || 
  process.argv[1].endsWith('preflight-cleanup.js')
);
if (isMain) {
  performPreflightCleanup().catch((e) => {
    console.error('Fatal preflight cleanup error:', e);
    process.exit(1);
  });
}
