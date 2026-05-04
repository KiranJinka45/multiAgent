// scripts/sre-certification/truth-dashboard.js
/**
 * Level 5 Truth Dashboard: Perception vs Reality.
 * Visualizes the gap between what the system wants, what it sees,
 * and what the physical world is actually doing.
 */
class TruthDashboard {
  static render(intent, perception, reality) {
    console.log("\n📡 [LEVEL-5 AUDIT DASHBOARD]");
    console.log("==========================================================================");
    console.log(`  [INTENT]     Target State: ${intent.dns} | Provider: ${intent.region}`);
    console.log(`  [REALITY]    Physical State: ${reality.dns} | DB: ${reality.db.primary}`);
    
    const consensus = perception.details.dns ? 'HIGH' : 'LOW';
    const drift = perception.consistent ? 'NONE' : 'DETECTED';
    
    console.log(`  [PERCEPTION] Confidence: ${consensus} | Drift: ${drift}`);
    console.log(`  [STATUS]     Governance Mode: ${perception.consistent ? 'STABLE' : 'HEALING'}`);
    console.log("==========================================================================\n");
  }
}

module.exports = TruthDashboard;
