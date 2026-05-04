import { validateSystem } from "./validator";
import { SystemMetrics } from "./types";
import { main as runAutoRefactor } from "@packages/refactor-agent";
import { analyzeSystem } from "./analyzer";
import { proposeFix } from "./architect";

export class SelfEvolver {
  private history: unknown[] = [];
  private static totalFailures = 0;
  private static IS_DISABLED = false;

  constructor(private options: { autoRefactor: boolean } = { autoRefactor: false }) {}

  async evolve(metrics: SystemMetrics, logs: string[]) {
    if (SelfEvolver.IS_DISABLED) {
      console.error("⛔ [Evolution] Kill Switch is ACTIVE. Evolution aborted.");
      return { status: 'disabled' };
    }

    console.log("🔍 [Evolution] Initiating system audit...");
    const issues = analyzeSystem(metrics, logs);

    if (issues.length === 0) {
      console.log("✅ [Evolution] System is healthy and architecture is stable.");
      return { status: 'healthy', issues: [] };
    }

    console.log(`⚠️ [Evolution] Detected ${issues.length} architectural or performance issues.`);
    console.log("🧠 [Evolution] Consulting Architect Agent for improvements...");

    const proposal = await proposeFix(issues);
    console.log("📋 [Evolution] PROPOSED ARCHITECTURAL UPGRADE:");
    console.log(proposal);

    this.history.push({
      timestamp: new Date().toISOString(),
      issues,
      proposal,
      applied: false
    });

    if (this.options.autoRefactor) {
      console.log("🔧 [Evolution] Auto-refactor is enabled. Applying changes...");
      
      try {
        // Validation Gate Pre-apply
        if (!validateSystem()) {
          console.error("❌ [Evolution] Pre-apply validation failed. Aborting evolution.");
          return { status: 'unsafe_baseline', issues };
        }

        // Apply
        await runAutoRefactor();
        
        // Validation Gate Post-apply
        if (!validateSystem()) {
          console.error("❌ [Evolution] Post-apply validation failed. Rolling back...");
          await this.rollback();
          return { status: 'rollback_triggered', proposal };
        }

        console.log("✅ [Evolution] Evolution successfully applied and validated.");
        SelfEvolver.totalFailures = 0; // Reset on success
        return { status: 'evolved', proposal };
      } catch (err) {
        console.error("❌ [Evolution] Execution error during evolution:", err);
        SelfEvolver.totalFailures++;
        
        if (SelfEvolver.totalFailures >= 3) {
          console.error("🚨 [Evolution] CRITICAL: 3 consecutive evolution failures. Activating Kill Switch.");
          SelfEvolver.IS_DISABLED = true;
        }

        await this.rollback();
        return { status: 'error', error: String(err) };
      }
    }

    return { status: 'proposed', proposal };
  }

  async rollback() {
    console.log("🔄 [Evolution] ROLLBACK INITIATED: Restoring last known stable state...");
    // In production, this would revert git commits or restore filesystem snapshots
    this.history.push({
      timestamp: new Date().toISOString(),
      type: 'rollback',
      reason: 'Validation failure'
    });
  }

  getHistory() {
    return this.history;
  }
}

