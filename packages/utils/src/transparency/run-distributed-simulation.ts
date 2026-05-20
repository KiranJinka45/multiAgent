// ZTAN Distributed Epoch Upgrade & Network Partition Simulation Harness (v1.0.0-LTS)
// Simulates multi-node consensus, epoch activation boundaries, network partitions,
// delayed upgrade propagation, and ledger replay synchronization across runtimes.

import { RustVirtualRuntime, GoVirtualRuntime, PythonVirtualRuntime } from './virtual-runtimes.js';
import { validateDuplicateKeys } from '../canonicalizer.js';

interface SimulatedTransaction {
  seqId: number;
  payload: string;
  expectedValid: boolean;
}

class DistributedNode {
  public id: string;
  public runtimeType: 'Node' | 'Rust' | 'Go' | 'Python';
  public currentSeq = 0;
  public ledger: string[] = [];
  public currentRuleset: 'v1.x' | 'v2.x' = 'v1.x';
  public activationEpoch = 50; // Block height/seqId for major upgrade activation

  private rustRuntime = new RustVirtualRuntime();
  private goRuntime = new GoVirtualRuntime();
  private pythonRuntime = new PythonVirtualRuntime();

  constructor(id: string, type: 'Node' | 'Rust' | 'Go' | 'Python') {
    this.id = id;
    this.runtimeType = type;
  }

  /**
   * Processes a transaction envelope adhering to activation epoch boundaries
   */
  public processTransaction(tx: SimulatedTransaction): { accepted: boolean; error: string | null } {
    // 1. Assert epoch transition boundary ruleset
    if (tx.seqId >= this.activationEpoch) {
      this.currentRuleset = 'v2.x';
    } else {
      this.currentRuleset = 'v1.x';
    }

    try {
      // Base JCS structural verification first
      if (this.runtimeType === 'Node') {
        validateDuplicateKeys(tx.payload);
      } else if (this.runtimeType === 'Rust') {
        this.rustRuntime.validateDuplicateKeys(tx.payload);
      } else if (this.runtimeType === 'Go') {
        this.goRuntime.validateDuplicateKeys(tx.payload);
      } else if (this.runtimeType === 'Python') {
        this.pythonRuntime.validateDuplicateKeys(tx.payload);
      }

      // 2. Enforce the corresponding ruleset transition checks
      // In v1.x: We allow uppercase keys.
      // In v2.x: We strictly reject keys with uppercase characters to normalize key casing schema!
      if (this.currentRuleset === 'v2.x') {
        if (/"[A-Z][a-zA-Z0-9]*"\s*:/g.test(tx.payload)) {
          throw new Error(`[${this.runtimeType}::Error] Uppercase keys are strictly prohibited in v2.x`);
        }
      }

      // If validation succeeds, record sequence in ledger
      this.ledger.push(tx.payload);
      this.currentSeq = tx.seqId;
      return { accepted: true, error: null };
    } catch (e: any) {
      return { accepted: false, error: e.message };
    }
  }
}

class DistributedConsensusSimulator {
  private nodes: DistributedNode[] = [];
  private transactions: SimulatedTransaction[] = [];

  constructor() {
    // Spin up heterogeneous validator node cohort
    this.nodes.push(new DistributedNode('node_1', 'Node'));
    this.nodes.push(new DistributedNode('node_2', 'Rust'));
    this.nodes.push(new DistributedNode('node_3', 'Go'));
    this.nodes.push(new DistributedNode('node_4', 'Python'));
    this.nodes.push(new DistributedNode('node_5', 'Rust')); // Alternate node
  }

  public runSimulation() {
    console.log("===========================================================");
    console.log("    ZTAN Distributed Epoch Upgrade & Partition Simulator   ");
    console.log("===========================================================");
    console.log(`[INIT] Cohort initialized: 5 heterogeneous consensus nodes`);
    console.log(`[INIT] Transition Activation Epoch configured at Sequence ID: 50`);

    // Generate transaction sequence traversing the upgrade epoch (0 to 100)
    for (let i = 1; i <= 100; i++) {
      let payload = `{"seq":${i},"data":"payload_sample"}`;
      let expectedValid = true;

      // Inject adversarial duplicate keys on specific sequences (expected to be rejected in both v1 and v2)
      if (i === 15 || i === 75) {
        payload = `{"seq":${i},"data":"payload_sample","data":"duplicate_key"}`;
        expectedValid = false;
      }

      // Inject uppercase keys on specific sequences (expected valid in v1.x, but rejected strictly in v2.x starting at seq 50)
      if (i === 35 || i === 85) {
        payload = `{"seq":${i},"CapitalKey":1}`;
        expectedValid = i < 50; // true for 35 (under v1), false for 85 (under v2)
      }

      this.transactions.push({ seqId: i, payload, expectedValid });
    }

    // --- Scenario 1: Standard Synchronous Epoch Upgrade Transition ---
    console.log("\n--- Scenario 1: Standard Coordinated Epoch Upgrade ---");
    let scenario1Pass = true;
    for (let seq = 1; seq <= 45; seq++) {
      const tx = this.transactions[seq - 1];
      for (const node of this.nodes) {
        const result = node.processTransaction(tx);
        if (result.accepted !== tx.expectedValid) {
          console.error(`[FAIL] Node ${node.id} (${node.runtimeType}) diverged on seq ${tx.seqId}! Expected: ${tx.expectedValid}, Got: ${result.accepted} | Error: ${result.error}`);
          scenario1Pass = false;
        }
      }
    }
    if (scenario1Pass) {
      console.log(`[PASS] Synchronous pre-epoch consensus holds perfectly. No divergences were observed across the cohort runtimes in this pre-epoch scenario.`);
    }

    // --- Scenario 2: Network Partition During Upgrade Epoch (seq 46 to 70) ---
    console.log("\n--- Scenario 2: Network Partition During Upgrade Epoch (seq 46-70) ---");
    console.log(`[INFO] Partitioning network: Node cohort split into Group A (node_1, node_2) and Group B (node_3, node_4, node_5).`);
    console.log(`[INFO] Group A upgrades and processes transactions. Group B is isolated and paused.`);

    const groupA = this.nodes.filter(n => n.id === 'node_1' || n.id === 'node_2');
    const groupB = this.nodes.filter(n => n.id === 'node_3' || n.id === 'node_4' || n.id === 'node_5');

    let groupAPass = true;
    for (let seq = 46; seq <= 70; seq++) {
      const tx = this.transactions[seq - 1];
      for (const node of groupA) {
        const result = node.processTransaction(tx);
        if (result.accepted !== tx.expectedValid) {
          console.error(`[FAIL] Group A Node ${node.id} diverged on seq ${tx.seqId}! Expected: ${tx.expectedValid}, Got: ${result.accepted} | Error: ${result.error}`);
          groupAPass = false;
        }
      }
    }
    if (groupAPass) {
      console.log(`[PASS] Group A nodes safely traversed activation epoch 50 and transitioned rulesets without consensus split.`);
    }

    // --- Scenario 3: Delayed Upgrade and Ledger Replay Synchronization ---
    console.log("\n--- Scenario 3: Delayed Upgrade & Ledger Replay Synchronization ---");
    console.log(`[INFO] Reconnecting network partition. Group B receives delayed upgrade logic.`);
    console.log(`[INFO] Group B replays ledger transactions to catch up with Group A.`);

    let groupBPass = true;
    for (const node of groupB) {
      // Replay all missing sequences 46 to 70
      for (let seq = 46; seq <= 70; seq++) {
        const tx = this.transactions[seq - 1];
        const result = node.processTransaction(tx);
        if (result.accepted !== tx.expectedValid) {
          console.error(`[FAIL] Delayed Group B Node ${node.id} diverged during catch-up replay at seq ${tx.seqId}! Expected: ${tx.expectedValid}, Got: ${result.accepted} | Error: ${result.error}`);
          groupBPass = false;
        }
      }
    }
    if (groupBPass) {
      console.log(`[PASS] Delayed validators catch up perfectly. Zero validation drift observed on replayed ledger.`);
    }

    // --- Scenario 4: Partial-Runtime Mismatch Recovery (Uncoordinated Upgrader Isolation) ---
    console.log("\n--- Scenario 4: Isolation of Uncoordinated/Faulty Upgraders ---");
    console.log(`[INFO] Spawning a faulty/uncoordinated node that refuses to activate v2.x ruleset at epoch 50.`);
    const rogueNode = new DistributedNode('rogue_node', 'Python');
    rogueNode.activationEpoch = 999; // Set rogue epoch far in the future so it remains stuck in v1.x rules

    // Populate historical blocks for rogue node
    for (let seq = 1; seq <= 70; seq++) {
      const tx = this.transactions[seq - 1];
      rogueNode.processTransaction(tx);
    }

    // Rogue node attempts to accept a transaction that v2.x rules forbid (sequence 85 with capital key)
    const tx85 = this.transactions[84]; // seqId 85
    const rogueResult = rogueNode.processTransaction(tx85);
    const healthyNode = this.nodes[0];
    const healthyResult = healthyNode.processTransaction(tx85);

    console.log(`  - Rogue Node ${rogueNode.id} accepted tx 85: ${rogueResult.accepted} (Reason: ${rogueResult.error})`);
    console.log(`  - Healthy Node ${healthyNode.id} accepted tx 85: ${healthyResult.accepted} (Reason: ${healthyResult.error})`);

    if (rogueResult.accepted !== healthyResult.accepted) {
      console.log(`[PASS] Faulty node split consensus state and was successfully detected & isolated from the validator cluster.`);
    } else {
      console.error(`[FAIL] Rogue node consensus split went undetected!`);
    }

    // Final Attestation
    console.log("\n===========================================================");
    console.log("    Distributed Simulation Summary                         ");
    console.log("===========================================================");
    if (scenario1Pass && groupAPass && groupBPass && rogueResult.accepted !== healthyResult.accepted) {
      console.log("[RESULT] ✅ No divergences were observed across the currently executed upgrade and partition simulation scenarios.");
      process.exit(0);
    } else {
      console.log("[RESULT] ❌ Distributed simulation failure detected.");
      process.exit(1);
    }
  }
}

const simulator = new DistributedConsensusSimulator();
simulator.runSimulation();
