// scripts/sre-certification/nemesis.js
/**
 * The Nemesis: Injects adversarial faults to break distributed systems.
 */
class Nemesis {
  constructor() {
    this.activeFaults = new Set();
  }

  async partition(regionA, regionB) {
    console.log(`💣 [NEMESIS] Partitioning ${regionA} <--> ${regionB}`);
    process.env[`PARTITION_${regionA}_${regionB}`] = 'TRUE';
    process.env[`PARTITION_${regionB}_${regionA}`] = 'TRUE';
    this.activeFaults.add(`PARTITION_${regionA}_${regionB}`);
  }

  async packetLoss(region, rate = 0.5) {
    console.log(`💣 [NEMESIS] Injecting ${rate*100}% Packet Loss to ${region}`);
    process.env[`DROP_RATE_${region}`] = rate.toString();
    this.activeFaults.add(`DROP_RATE_${region}`);
  }

  async delay(region, ms = 1000) {
    console.log(`💣 [NEMESIS] Injecting ${ms}ms Network Delay to ${region}`);
    process.env[`JITTER_${region}`] = ms.toString();
    this.activeFaults.add(`JITTER_${region}`);
  }

  async kill(region) {
    console.log(`💀 [NEMESIS] Terminating Control Plane in ${region}`);
    process.env[`PROCESS_KILLED_${region}`] = 'TRUE';
    this.activeFaults.add(`PROCESS_KILLED_${region}`);
  }

  async heal() {
    console.log("🟢 [NEMESIS] Healing all faults...");
    for (const fault of this.activeFaults) {
      delete process.env[fault];
    }
    this.activeFaults.clear();
  }
}

module.exports = new Nemesis();
