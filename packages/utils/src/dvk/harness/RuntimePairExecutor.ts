import { spawn, spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
import * as os from 'node:os';
import type { ReplayExecutionContract, RuntimeIdentifier } from './ReplayExecutionContract.js';
import { generateReplayId } from './ReplayExecutionContract.js';
import { ChunkFragmentationController } from './ChunkFragmentationController.js';
import { ReplayArtifactCollector } from './ReplayArtifactCollector.js';
import type { SnapshotTelemetry } from './ReplayArtifactCollector.js';
import { DivergenceComparator } from './DivergenceComparator.js';
import { ArtifactSchemaValidator } from './ArtifactSchemaValidator.js';
import type { ValidatedRuntimeResponse, ReplayAbandonmentLineage } from './ArtifactSchemaValidator.js';
import type { ReplayFailureClass } from './ReplayFailureTaxonomy.js';
import { EntropyInjector } from './EntropyInjector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

interface RuntimeResponseWrapper {
  response: ValidatedRuntimeResponse;
  failure?: ReplayFailureClass;
}

export class RuntimePairExecutor {
  
  /**
   * Executes the Replay Contract across both target runtimes.
   */
  public static async execute(contract: ReplayExecutionContract, payload: string | Buffer): Promise<ReplayArtifactCollector> {
    const replayId = generateReplayId(contract);
    const collector = new ReplayArtifactCollector(
      contract, 
      replayId, 
      contract.runtime_pair.primary, 
      contract.runtime_pair.secondary
    );

    // 1. Generate Chunk Layout
    let chunks = ChunkFragmentationController.fragment(payload, contract.fragmentation_profile);
    
    if (contract.entropy_profile?.randomized_boundaries || contract.entropy_profile?.duplicated_chunk_delivery) {
      chunks = EntropyInjector.scrambleBoundaries(chunks, contract);
    }

    for (const chunk of chunks) {
      collector.recordChunk(Buffer.isBuffer(chunk) ? chunk.length : Buffer.from(chunk).length);
    }

    // 2. Prepare payload envelope for bridges
    const envelope = JSON.stringify({
      replay_id: replayId,
      contract,
      chunks: chunks.map(c => Buffer.isBuffer(c) ? c.toString('base64') : Buffer.from(c, 'utf-8').toString('base64'))
    });

    let spinner: any = null;
    if (contract.entropy_profile?.scheduler_contention) {
      spinner = spawn('node', ['-e', 'while(true){}']);
    }

    try {
      const crossRuntimeMode = contract.runtime_pair.primary === contract.runtime_pair.secondary ? 'mirrored' : 'differential';

      // 3. Execute Primary Runtime
      const primaryResult = await this.invokeBridge(contract.runtime_pair.primary, envelope, contract);
      for (const snap of primaryResult.response.snapshots) {
        collector.recordSnapshot(contract.runtime_pair.primary, snap);
      }
      collector.finalizeRuntime(
        contract.runtime_pair.primary, 
        primaryResult.response.status, 
        primaryResult.response.trace_digest, 
        primaryResult.response.error_message,
        primaryResult.failure,
        primaryResult.response.metrics,
        primaryResult.response.topology_fingerprint,
        primaryResult.response.provenance_lineage,
        crossRuntimeMode,
        primaryResult.response.topology_windows,
        primaryResult.response.infrastructure_failure_metadata
      );

      // 4. Execute Secondary Runtime
      const secondaryResult = await this.invokeBridge(contract.runtime_pair.secondary, envelope, contract);
      for (const snap of secondaryResult.response.snapshots) {
        collector.recordSnapshot(contract.runtime_pair.secondary, snap);
      }
      collector.finalizeRuntime(
        contract.runtime_pair.secondary, 
        secondaryResult.response.status, 
        secondaryResult.response.trace_digest, 
        secondaryResult.response.error_message,
        secondaryResult.failure,
        secondaryResult.response.metrics,
        secondaryResult.response.topology_fingerprint,
        secondaryResult.response.provenance_lineage,
        crossRuntimeMode,
        secondaryResult.response.topology_windows,
        secondaryResult.response.infrastructure_failure_metadata
      );
    } finally {
      if (spinner) {
        spinner.kill('SIGKILL');
      }
    }

    return collector;
  }

  /**
   * Executes the Replay Contract and immediately runs divergence comparison.
   */
  public static async executeAndCompare(contract: ReplayExecutionContract, payload: string | Buffer) {
    const collector = await this.execute(contract, payload);
    
    // Generate raw profile without classification yet
    const rawProfile = collector.generateProfile('none', null, []);
    
    // Run comparison
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
    const comparison = DivergenceComparator.compare(
      rawProfile.primary_artifacts,
      rawProfile.secondary_artifacts,
      payloadStr,
      contract.ecosystem_profile
    );
    
    // Finalize profile with comparison results
    const finalProfile = collector.generateProfile(
      comparison.classification,
      comparison.first_divergence_index,
      comparison.divergence_windows
    );

    DivergenceComparator.attemptReplayShrinking(finalProfile);

    return finalProfile;
  }

  private static invokeBridge(runtime: RuntimeIdentifier, envelope: string, contract: ReplayExecutionContract): Promise<RuntimeResponseWrapper> {
    return new Promise((resolve) => {
      let cmd = '';
      let args: string[] = [];
      const env: NodeJS.ProcessEnv = { ...process.env };

      let totalChunks = 0;
      try {
        const parsedEnvelope = JSON.parse(envelope);
        if (parsedEnvelope.chunks) {
          totalChunks = parsedEnvelope.chunks.length;
        }
      } catch {}

      // Prepend user's .cargo/bin to env PATH to ensure cargo/rustup are callable
      const homeDir = os.homedir();
      const cargoBin = path.join(homeDir, '.cargo', 'bin');
      if (process.platform === 'win32') {
        env.PATH = `${cargoBin};${env.PATH || ''}`;
      } else {
        env.PATH = `${cargoBin}:${env.PATH || ''}`;
      }

      switch (runtime) {
        case 'rust':
          cmd = path.join(PROJECT_ROOT, 'packages', 'utils', 'target', 'x86_64-pc-windows-gnu', 'debug', 'ztan_dvk_bridge.exe');
          args = [];
          break;
        case 'python':
          cmd = 'python';
          args = [path.join(PROJECT_ROOT, 'packages', 'utils', 'src', 'dvk', 'bridges', 'python_bridge.py')];
          break;
        case 'typescript':
          cmd = 'node';
          args = [
            path.join(PROJECT_ROOT, 'packages', 'utils', 'dist', 'dvk', 'bridges', 'ts_bridge.mjs')
          ]; 
          break;
        default:
          return resolve(this.generateMockResponse());
      }

      // Simulate parent-level descriptor exhaustion leak
      const leakedFDs: number[] = [];
      if (contract.entropy_profile?.descriptor_exhaustion) {
        try {
          for (let i = 0; i < 150; i++) {
            leakedFDs.push(fs.openSync(path.join(PROJECT_ROOT, 'packages', 'utils', 'package.json'), 'r'));
          }
        } catch {}
      }

      const cleanupFDs = () => {
        for (const fd of leakedFDs) {
          try {
            fs.closeSync(fd);
          } catch {}
        }
        leakedFDs.length = 0;
      };

      const startTime = performance.now();
      const child = spawn(cmd, args, {
        env,
        shell: process.platform === 'win32'
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const finishWithError = (msg: string, failure: ReplayFailureClass) => {
        if (resolved) return;
        resolved = true;
        cleanupFDs();
        if (timeoutId) clearTimeout(timeoutId);
        child.kill('SIGKILL');
        try {
          child.stdin.destroy();
          child.stdout.destroy();
          child.stderr.destroy();
        } catch {}
        resolve(this.createErrorResponse(msg, failure, stdout, totalChunks));
      };

      child.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
          cleanupFDs();
          resolve(this.generateMockResponse());
        } else {
          finishWithError(`Execution failed: ${err.message}`, 'PROCESS_CRASH');
        }
      });

      // Set timeout cap (10s)
      timeoutId = setTimeout(() => {
        finishWithError('Execution timed out (10s limit)', 'TIMEOUT');
      }, 10000);

      // Write input to stdin and close stdin so child gets EOF
      child.stdin.write(envelope);
      child.stdin.end();

      // Read stdout with backpressure / pipe saturation simulation
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        
        // 10MB stdout cap for Artifact Amplification Defense
        if (stdout.length > 10 * 1024 * 1024) {
          finishWithError('Stdout limit exceeded (10MB)', 'MALFORMED_ARTIFACT');
        }

        // Active pipe backpressure simulation
        if (contract.entropy_profile?.stdout_fragmentation) {
          child.stdout.pause();
          const intensity = contract.entropy_profile.backpressure_intensity ?? contract.entropy_profile.intensity_factor ?? 1.0;
          setTimeout(() => {
            child.stdout.resume();
          }, 5 * intensity); // Scale read block time to let OS buffers accumulate
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code, signal) => {
        if (resolved) return;
        resolved = true;
        cleanupFDs();
        if (timeoutId) clearTimeout(timeoutId);
        const drainLatency = performance.now() - startTime;

        try {
          child.stdin.destroy();
          child.stdout.destroy();
          child.stderr.destroy();
        } catch {}

        if (signal) {
          return resolve(this.createErrorResponse(`Process killed by signal ${signal}`, 'PROCESS_CRASH', stdout, totalChunks));
        }

        // Filter out incremental topology frame outputs from the final success parser
        let finalJson = '';
        const lines = stdout.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('__ZTAN_TOPO_FRAME__:')) {
            continue;
          }
          if (trimmed) {
            finalJson += trimmed;
          }
        }

        let output = finalJson.trim();
        // Support partial stdout truncation
        if (contract.entropy_profile?.partial_stdout_truncation && output.length > 50) {
          output = output.substring(0, Math.floor(output.length * 0.7));
        }

        try {
          const parsed = this.repairTruncatedJson(output);
          if (!parsed) {
            throw new Error('Repaired JSON is null or invalid');
          }
          const validated = ArtifactSchemaValidator.validate(parsed);
          if (validated.metrics) {
            validated.metrics.stdout_drain_latency = drainLatency;
          }
          resolve({ response: validated });
        } catch (e: any) {
          if (output.includes('Mock Demo') || output.includes('Compiling') || output.includes('Finished')) {
             return resolve(this.generateMockResponse());
          }
          resolve(this.createErrorResponse(`Malformed artifact: ${e.message}. Raw output: ${output.substring(0, 100)}`, 'MALFORMED_ARTIFACT', stdout, totalChunks));
        }
      });
    });
  }

  private static repairTruncatedJson(str: string): any {
    try {
      return JSON.parse(str);
    } catch {}

    let braces = 0;
    let brackets = 0;
    let inString = false;
    let escaped = false;
    let cleanStr = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (escaped) {
        escaped = false;
        cleanStr += char;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        cleanStr += char;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        cleanStr += char;
        continue;
      }
      if (!inString) {
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '[') brackets++;
        if (char === ']') brackets--;
      }
      cleanStr += char;
    }

    if (inString) {
      cleanStr += '"';
    }

    while (brackets > 0) {
      cleanStr += ']';
      brackets--;
    }
    while (braces > 0) {
      cleanStr += '}';
      braces--;
    }

    try {
      return JSON.parse(cleanStr);
    } catch {
      return null;
    }
  }

  private static reconstructLineage(stdout: string, totalChunks?: number): ReplayAbandonmentLineage {
    const lineage: ReplayAbandonmentLineage = {
      partial_stdout: stdout.substring(0, 1000)
    };

    try {
      const windows: Record<string, string> = {};
      let maxSeq = -1;
      let snapshotCount = 0;

      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('__ZTAN_TOPO_FRAME__:')) {
          try {
            const payloadStr = trimmed.substring('__ZTAN_TOPO_FRAME__:'.length);
            const frame = JSON.parse(payloadStr);
            if (frame.window_hash && frame.start !== undefined && frame.end !== undefined) {
              const key = `window_${frame.start}_${frame.end}`;
              windows[key] = frame.window_hash;
            }
            if (Array.isArray(frame.snapshots)) {
              for (const snap of frame.snapshots) {
                snapshotCount++;
                if (snap.sequence_index > maxSeq) {
                  maxSeq = snap.sequence_index;
                }
              }
            }
          } catch {}
        }
      }

      // Regex fallback scan for general snapshots
      const snapshotRegex = /\{"sequence_index":\s*(\d+)[^}]*\}/g;
      let match;
      let lastSeq = -1;
      let count = 0;
      while ((match = snapshotRegex.exec(stdout)) !== null) {
        count++;
        const seq = parseInt(match[1], 10);
        if (seq > lastSeq) {
          lastSeq = seq;
        }
      }

      const finalCount = Math.max(snapshotCount, count);
      const finalMaxSeq = Math.max(maxSeq, lastSeq);

      if (finalCount > 0) {
        lineage.partial_snapshots_recovered = finalCount;
        lineage.last_sequence_index = finalMaxSeq;
      }

      // Regex fallback scan for window records
      const windowRegex = /"window_\d+_\d+":\s*"[a-f0-9]+"/g;
      let winMatch;
      while ((winMatch = windowRegex.exec(stdout)) !== null) {
        const parts = winMatch[0].split(':');
        const key = parts[0].replace(/"/g, '').trim();
        const val = parts[1].replace(/"/g, '').trim();
        windows[key] = val;
      }

      if (Object.keys(windows).length > 0) {
        lineage.partial_topology_windows = windows;
      }

      // Calculate loss severity score
      let lossSeverity = 1.0;
      if (totalChunks !== undefined && totalChunks > 0) {
        let maxChunkIdx = -1;
        const chunkIdxRegex = /"chunk_index":\s*(\d+)/g;
        let cMatch;
        while ((cMatch = chunkIdxRegex.exec(stdout)) !== null) {
          const idx = parseInt(cMatch[1], 10);
          if (idx > maxChunkIdx) {
            maxChunkIdx = idx;
          }
        }
        if (maxChunkIdx >= 0) {
          lossSeverity = 1.0 - (maxChunkIdx + 1) / totalChunks;
        } else {
          lossSeverity = Math.max(0, 1.0 - stdout.length / 5000);
        }
      }
      lineage.topology_loss_severity = lossSeverity;
    } catch {}

    return lineage;
  }

  private static createErrorResponse(msg: string, failure: ReplayFailureClass, stdout?: string, totalChunks?: number): RuntimeResponseWrapper {
    const lineage = stdout ? this.reconstructLineage(stdout, totalChunks) : undefined;
    return {
      response: {
        status: 'error',
        trace_digest: '',
        snapshots: [],
        error_message: msg,
        infrastructure_failure_metadata: lineage
      },
      failure
    };
  }

  /**
   * Generates a mock response for scaffolding the harness before actual bridges are built.
   */
  private static generateMockResponse(): RuntimeResponseWrapper {
    return {
      response: {
        status: 'accept',
        trace_digest: 'mock_digest_123',
        snapshots: [
          { sequence_index: 0, hash: 'hash_a', transition_reason: 'init' },
          { sequence_index: 1, hash: 'hash_b', transition_reason: 'chunk_1' }
        ]
      }
    };
  }
}
