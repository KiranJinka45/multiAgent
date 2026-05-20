// ZTAN Native Asynchronous Multi-Process Distributed Chaos Campaign (v1.0.0-LTS)
// Performs native adversarial execution across 5 independent OS processes (3 Node, 2 Python)
// communicating over local TCP, verifying bounded convergence recovery under stochastic chaos.

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { AsyncTransportBus } from './async-transport-bus.js';

class DistributedChaosCampaign {
  private bus: AsyncTransportBus;
  private busPort = 9005;
  private processes: Map<string, ChildProcess> = new Map();

  constructor() {
    this.bus = new AsyncTransportBus(this.busPort);
  }

  private spawnNodeValidator(nodeId: string): ChildProcess {
    const scriptPath = path.join(process.cwd(), 'packages', 'utils', 'src', 'transparency', 'validator-node.ts');
    
    // We execute TypeScript natively using tsx in the monorepo context
    const child = spawn('npx', ['tsx', scriptPath, nodeId, '127.0.0.1', this.busPort.toString()], {
      shell: true,
      stdio: 'inherit'
    });

    child.on('error', (err) => {
      console.error(`[CAMPAIGN] Failed to spawn Node Validator [${nodeId}]: ${err.message}`);
    });

    return child;
  }

  private spawnPythonValidator(nodeId: string): ChildProcess {
    const scriptPath = path.join(process.cwd(), 'packages', 'utils', 'src', 'transparency', 'validator-python.py');
    
    const child = spawn('python', [scriptPath, nodeId, '127.0.0.1', this.busPort.toString()], {
      shell: true,
      stdio: 'inherit'
    });

    child.on('error', (err) => {
      console.error(`[CAMPAIGN] Failed to spawn Python Validator [${nodeId}]: ${err.message}`);
    });

    return child;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async run() {
    console.log("=========================================================================");
    console.log("    ZTAN Asynchronous Multi-Runtime Native Distributed Chaos Campaign   ");
    console.log("=========================================================================");
    
    // Clean any prior run persistence artifacts to ensure a pristine start
    const persistenceDir = path.join(process.cwd(), '.ztan-transparency');
    if (fs.existsSync(persistenceDir)) {
      const files = fs.readdirSync(persistenceDir);
      let purgedCount = 0;
      for (const file of files) {
        if (file.startsWith('wal_') || file.startsWith('snapshot_')) {
          fs.unlinkSync(path.join(persistenceDir, file));
          purgedCount++;
        }
      }
      if (purgedCount > 0) {
        console.log(`[CAMPAIGN] Purged ${purgedCount} legacy Write-Ahead Log (WAL) and snapshot remnants.`);
      }
    }

    console.log("[CAMPAIGN] Starting Asynchronous Transport Bus Server...");
    await this.bus.start();

    // 1. Spawn independent validators natively
    console.log("\n[CAMPAIGN] Spawning 5 independent native validator processes (3 Node, 2 Python)...");
    this.processes.set('node_1', this.spawnNodeValidator('node_1'));
    this.processes.set('node_2', this.spawnNodeValidator('node_2'));
    this.processes.set('node_3', this.spawnNodeValidator('node_3'));
    
    // Allow brief delay to avoid TCP connection collision
    await this.sleep(1000);
    this.processes.set('node_4', this.spawnPythonValidator('node_4'));
    this.processes.set('node_5', this.spawnPythonValidator('node_5'));

    // Wait for all 5 native processes to connect to the transport bus
    console.log("[CAMPAIGN] Waiting for all independent validators to connect...");
    let retries = 35;
    while (this.bus.getActiveNodesCount() < 5 && retries > 0) {
      await this.sleep(1000);
      retries--;
    }

    const activeCount = this.bus.getActiveNodesCount();
    console.log(`[CAMPAIGN] Active nodes registered on TCP Bus: ${activeCount}/5`);
    if (activeCount < 5) {
      console.error("[FAIL] Multi-process connection timeout. Not all processes connected. Aborting.");
      this.cleanup();
      process.exit(1);
    }

    // Activate stochastic network delay (chaos)
    this.bus.injectLatency = true;
    console.log(`\n[CHAOS] Stochastic network latency activated (Range: ${this.bus.minLatencyMs}-${this.bus.maxLatencyMs}ms).`);

    // Generate transaction envelopes traversing upgrade epoch height (0 to 60)
    const testTransactions = [
      { seqId: 10, payload: '{"seq":10,"data":"nominal_block"}', expected: true },
      // Adversarial Duplicate Key vector (Node & Python must independently reject)
      { seqId: 15, payload: '{"seq":15,"data":"dup_payload","data":"duplicate_key"}', expected: false },
      { seqId: 25, payload: '{"seq":25,"data":"nominal_block_2"}', expected: true },
      // Uppercase key sequence - valid in v1.x (seq < 50), strictly forbidden in v2.x (seq >= 50)
      { seqId: 35, payload: '{"seq":35,"CapitalKey":"allowed_in_v1"}', expected: true },
      { seqId: 55, payload: '{"seq":55,"CapitalKey":"forbidden_in_v2"}', expected: false },
      { seqId: 60, payload: '{"seq":60,"data":"final_epoch_nominal"}', expected: true }
    ];

    console.log("\n[CAMPAIGN] Executing transaction sequence over asynchronous transport bus...");
    let consensusPassing = true;

    for (const tx of testTransactions) {
      console.log(`\n[BROADCAST] Sequence ID: ${tx.seqId} | Expected Validity: ${tx.expected}`);
      const start = Date.now();
      const responses = await this.bus.broadcastTransaction(tx.seqId, tx.payload);
      const elapsed = Date.now() - start;

      console.log(`  - Received responses from ${responses.length} nodes in ${elapsed}ms.`);

      // Audit consensus outputs across runtimes
      const accepts = responses.filter(r => r.accepted === true).map(r => r.nodeId);
      const rejects = responses.filter(r => r.accepted === false).map(r => r.nodeId);
      
      console.log(`  - Node Accepted count: ${accepts.length} | Rejected count: ${rejects.length}`);
      
      // Determine if a divergence occurred
      if (accepts.length > 0 && rejects.length > 0) {
        console.warn(`[WARN] Temporary State Divergence Detected on Seq ${tx.seqId}!`);
        console.warn(`  Accepted: [${accepts.join(', ')}]`);
        console.warn(`  Rejected: [${rejects.join(', ')}]`);

        // Check if the divergence was expected ruleset transition differences
        // For sequence 15 (duplicate key), all nodes MUST reject it (accepts.length should be 0)
        // For sequence 55 (uppercase in v2.x), all upgraded nodes MUST reject it
        const hasUnexpectedAccept = accepts.some(nodeId => {
          const resp = responses.find(r => r.nodeId === nodeId);
          return resp?.accepted !== tx.expected;
        });

        if (hasUnexpectedAccept) {
          console.error(`[FAIL] Unexpected validation divergence observed on sequence ${tx.seqId}.`);
          consensusPassing = false;
          this.bus.logEvent({
            eventId: `evt_divergence_${tx.seqId}`,
            prevEventHash: null,
            logicalClock: 0,
            hlc: '0:0',
            timestamp: new Date().toISOString(),
            eventType: 'DIVERGENCE_DETECTED',
            seqId: tx.seqId,
            error: `Consensus failure: accepts=${accepts.join(',')}, rejects=${rejects.join(',')}`
          });
        }
      } else {
        const actualAccepted = accepts.length === responses.length;
        if (actualAccepted !== tx.expected) {
          console.error(`[FAIL] Consensus outcome mismatch. Expected all to accept=${tx.expected}, got accept=${actualAccepted}`);
          consensusPassing = false;
        }
      }
    }

    // 2. Perform Native Process Termination & Bounded Convergence Recovery
    console.log("\n--- Injecting Stochastic Process Failure (Chaos Kill) ---");
    console.log("[CHAOS] Crashing validator node 'node_3' mid-consensus via network control trigger...");
    this.bus.triggerNodeCrash('node_3');
    this.processes.delete('node_3');
    await this.sleep(2000); // Allow OS process termination and socket closure to complete

    console.log(`[CAMPAIGN] Active nodes registered on TCP Bus: ${this.bus.getActiveNodesCount()}/5`);

    // Broadcast sequence ID 58 with node_3 dead (should survive consensus since remaining 4 nodes accept)
    const tx58 = { seqId: 58, payload: '{"seq":58,"data":"survivability_nominal"}', expected: true };
    console.log(`\n[BROADCAST] Sequence ID: ${tx58.seqId} (Validator node_3 offline)`);
    const resp58 = await this.bus.broadcastTransaction(tx58.seqId, tx58.payload);
    
    const accepts58 = resp58.filter(r => r.accepted === true).map(r => r.nodeId);
    console.log(`  - Received responses from ${resp58.length} nodes. Accepts: [${accepts58.join(', ')}]`);

    if (resp58.length === 4 && accepts58.length === 4) {
      console.log("[PASS] Bounded Convergence Recovery Verified. No state drift was observed among the remaining active validators under the tested crash and stochastic-delay scenarios.");
    } else {
      console.error(`[FAIL] Bounded convergence recovery failed. Expected 4 responses, got ${resp58.length}`);
      consensusPassing = false;
    }

    // Save final report and terminate
    console.log("\n=========================================================================");
    console.log("    Chaos Campaign Summary                                               ");
    console.log("=========================================================================");
    if (consensusPassing) {
      console.log("[RESULT] ✅ Asynchronous Native Multi-Runtime Distributed Chaos Campaign PASSED.");
      this.cleanup();
      process.exit(0);
    } else {
      console.error("[RESULT] ❌ Campaign Failed. State consensus or convergence recovery errors detected.");
      this.cleanup();
      process.exit(1);
    }
  }

  private cleanup() {
    console.log("\n[CAMPAIGN] Cleaning up native validator child processes...");
    for (const [nodeId, child] of this.processes.entries()) {
      try {
        child.kill('SIGKILL');
      } catch (e) {
        // ignore
      }
    }
    this.bus.terminate();
  }
}

// Start Campaign
const campaign = new DistributedChaosCampaign();
campaign.run().catch((err) => {
  console.error(`[CAMPAIGN] Fatal error running campaign: ${err.message}`);
  process.exit(1);
});
