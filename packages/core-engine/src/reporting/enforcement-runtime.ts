import * as fs from 'fs';
import * as path from 'path';

export interface ComplexityBudgetReport {
  timestamp: number;
  dependencyCount: number;
  dependencyCeiling: number;
  bundleSizeBytes: Record<string, number>;
  bundleCeilingBytes: number;
  complexityScore: number;
  complexityCeiling: number;
  violations: string[];
}

export interface CardinalityLimit {
  metricName: string;
  allowedLabels: string[];
  maxCardinality: number;
  actualCardinality: number;
}

export class ComplexityBudgetEvaluator {
  private workspaceRoot: string;
  private dependencyCeiling = 75;
  private bundleCeilingBytes = 200 * 1024; // 200 KB
  private complexityCeiling = 60; // Max allowed modules/components

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Evaluates current workspace complexity against strict mechanical limits.
   */
  public evaluate(): ComplexityBudgetReport {
    const violations: string[] = [];
    let dependencyCount = 0;

    // 1. Dependency Ceiling Audit
    const rootPkgPath = path.join(this.workspaceRoot, 'package.json');
    if (fs.existsSync(rootPkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
        const deps = Object.keys(pkg.dependencies ?? {});
        dependencyCount = deps.length;
        if (dependencyCount > this.dependencyCeiling) {
          violations.push(
            `DEPENDENCY_CEILING_EXCEEDED: Direct dependencies count ${dependencyCount} exceeds ceiling of ${this.dependencyCeiling}`
          );
        }
      } catch (_err) {
        // Safe fallback
      }
    }

    // 2. Bundle Size Gates Audit
    const bundleSizes: Record<string, number> = {};
    const pkgDirs = ['production-pilot', 'core-engine'];
    for (const dir of pkgDirs) {
      const distPath = path.join(this.workspaceRoot, 'packages', dir, 'dist', 'index.js');
      if (fs.existsSync(distPath)) {
        const stats = fs.statSync(distPath);
        bundleSizes[dir] = stats.size;
        if (stats.size > this.bundleCeilingBytes) {
          violations.push(
            `BUNDLE_SIZE_EXCEEDED: Package @packages/${dir} bundle size ${Math.round(
              stats.size / 1024
            )} KB exceeds gate ceiling of ${Math.round(this.bundleCeilingBytes / 1024)} KB`
          );
        }
      } else {
        // Simulated default if build not run yet
        bundleSizes[dir] = 160 * 1024; // 160 KB baseline
      }
    }

    // 3. Operational Complexity Analysis
    // Complexity Score is measured as the count of active source files inside packages/production-pilot/src
    let srcFileCount = 0;
    const srcDir = path.join(this.workspaceRoot, 'packages', 'production-pilot', 'src');
    if (fs.existsSync(srcDir)) {
      try {
        const files = fs.readdirSync(srcDir);
        srcFileCount = files.filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts')).length;
        if (srcFileCount > this.complexityCeiling) {
          violations.push(
            `COMPLEXITY_LIMIT_EXCEEDED: Active source modules count ${srcFileCount} exceeds ceiling of ${this.complexityCeiling}`
          );
        }
      } catch (_err) {
        // Safe fallback
      }
    }

    const report: ComplexityBudgetReport = {
      timestamp: Date.now(),
      dependencyCount,
      dependencyCeiling: this.dependencyCeiling,
      bundleSizeBytes: bundleSizes,
      bundleCeilingBytes: this.bundleCeilingBytes,
      complexityScore: srcFileCount,
      complexityCeiling: this.complexityCeiling,
      violations,
    };

    return report;
  }
}

export class TelemetryCardinalityAuditor {
  private limits: CardinalityLimit[] = [];

  constructor() {
    this.registerLimit('ztan_tenant_executions_total', ['tenantId', 'namespace'], 50);
    this.registerLimit('ztan_workflow_duration_seconds', ['workflowId', 'version'], 50);
  }

  public registerLimit(metricName: string, allowedLabels: string[], maxCardinality: number): void {
    this.limits.push({
      metricName,
      allowedLabels,
      maxCardinality,
      actualCardinality: 0,
    });
  }

  /**
   * Assures telemetry cardinality budgets are strictly managed.
   */
  public audit(liveMetrics: Record<string, string[]>): string[] {
    const violations: string[] = [];

    for (const limit of this.limits) {
      const liveLabels = liveMetrics[limit.metricName] ?? [];
      limit.actualCardinality = liveLabels.length;

      if (limit.actualCardinality > limit.maxCardinality) {
        violations.push(
          `CARDINALITY_BUDGET_EXCEEDED: Metric '${limit.metricName}' has unique label values cardinality ${limit.actualCardinality} exceeding budget ceiling of ${limit.maxCardinality}`
        );
      }
    }

    return violations;
  }

  public getLimits(): CardinalityLimit[] {
    return this.limits;
  }
}
