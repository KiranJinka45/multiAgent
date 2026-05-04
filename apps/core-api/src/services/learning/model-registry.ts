import { logger } from '@packages/observability';

export interface ModelMetadata {
  version: string;
  timestamp: number;
  status: 'ACTIVE' | 'SHADOW' | 'ARCHIVED';
  performance: {
    avgBrier: number;
    avgRegret: number;
    successRate: number;
  };
}

export class ModelRegistry {
  private activeVersion: string = 'v5.0-soak-baseline';
  private shadowVersion: string | null = null;
  private history: Map<string, ModelMetadata> = new Map();

  constructor() {
    this.history.set(this.activeVersion, {
      version: this.activeVersion,
      timestamp: Date.now(),
      status: 'ACTIVE',
      performance: { avgBrier: 0.185, avgRegret: 0.082, successRate: 0.92 }
    });
  }

  public getActiveVersion() { return this.activeVersion; }
  public getShadowVersion() { return this.shadowVersion; }

  public createShadowModel(parentVersion: string): string {
    const newVersion = `v5.0-adaptive-${Date.now()}`;
    this.shadowVersion = newVersion;
    this.history.set(newVersion, {
      version: newVersion,
      timestamp: Date.now(),
      status: 'SHADOW',
      performance: { avgBrier: 0, avgRegret: 0, successRate: 0 }
    });
    logger.info({ newVersion }, '[MODEL-REGISTRY] New shadow model initialized for continuous learning');
    return newVersion;
  }

  public promoteShadow() {
    if (!this.shadowVersion) return;
    
    logger.info({ from: this.activeVersion, to: this.shadowVersion }, '[MODEL-REGISTRY] Promoting shadow model to ACTIVE');
    
    const active = this.history.get(this.activeVersion);
    if (active) active.status = 'ARCHIVED';
    
    this.activeVersion = this.shadowVersion;
    const shadow = this.history.get(this.shadowVersion);
    if (shadow) shadow.status = 'ACTIVE';
    
    this.shadowVersion = null;
  }

  public rollback() {
    // Find the latest ARCHIVED version
    const versions = Array.from(this.history.values())
      .filter(m => m.status === 'ARCHIVED')
      .sort((a, b) => b.timestamp - a.timestamp);

    if (versions.length > 0) {
      const target = versions[0];
      logger.error({ current: this.activeVersion, rollbackTo: target.version }, '[MODEL-REGISTRY] Emergency Rollback Initiated');
      
      const current = this.history.get(this.activeVersion);
      if (current) current.status = 'ARCHIVED';
      
      this.activeVersion = target.version;
      target.status = 'ACTIVE';
    }
  }

  public updatePerformance(version: string, perf: Partial<ModelMetadata['performance']>) {
    const model = this.history.get(version);
    if (model) {
      model.performance = { ...model.performance, ...perf };
    }
  }

  public getMetadata(version: string) {
    return this.history.get(version);
  }
}

export const modelRegistry = new ModelRegistry();
