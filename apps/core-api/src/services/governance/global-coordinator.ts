import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export interface GlobalSreEvent {
  clusterId: string;
  region: string;
  type: 'ACTION' | 'RCA' | 'TRUST' | 'ANOMALY';
  payload: any;
  ts: number;
}

export class GlobalCoordinator {
  private static CHANNEL = 'sre:global:events';
  private static clusters: Map<string, { lastSeen: number, status: any }> = new Map();

  public static async init() {
    const subscriber = redis.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(this.CHANNEL, (message) => {
      this.handleIncomingEvent(JSON.parse(message));
    });

    logger.info('[GlobalCoordinator] Initialized and listening for cluster events');
  }

  public static async publishEvent(event: Omit<GlobalSreEvent, 'ts'>) {
    const fullEvent = { ...event, ts: Date.now() };
    await redis.publish(this.CHANNEL, JSON.stringify(fullEvent));
  }

  private static handleIncomingEvent(event: GlobalSreEvent) {
    this.clusters.set(event.clusterId, { 
      lastSeen: event.ts, 
      status: event.payload 
    });

    // Conflict Detection Logic
    this.detectConflicts(event);

    // Cascading Failure Detection
    this.detectCascades(event);
  }

  private static detectConflicts(event: GlobalSreEvent) {
    if (event.type === 'ACTION') {
      // Example: Detect if another cluster is scaling down while this one scales up
      for (const [id, cluster] of this.clusters.entries()) {
        if (id === event.clusterId) continue;
        
        const otherAction = cluster.status.action;
        if (otherAction === 'SCALE_DOWN' && event.payload.action === 'SCALE_UP') {
          logger.warn({ 
            clusterA: event.clusterId, 
            clusterB: id,
            actionA: event.payload.action,
            actionB: otherAction
          }, '[GlobalCoordinator] CROSS-CLUSTER CONFLICT DETECTED');
          
          // Emit a global override or block
        }
      }
    }
  }

  private static detectCascades(event: GlobalSreEvent) {
    if (event.type === 'ANOMALY' && event.payload.zScore > 5) {
      // Detect if multiple regions are failing simultaneously
      const failingClusters = Array.from(this.clusters.values())
        .filter(c => c.status.zScore > 5 && (Date.now() - c.lastSeen) < 30000);

      if (failingClusters.length > 2) {
        logger.error({ 
          count: failingClusters.length 
        }, '[GlobalCoordinator] GLOBAL CASCADING FAILURE DETECTED');
      }
    }
  }

  public static getGlobalView() {
    return Array.from(this.clusters.entries()).map(([id, data]) => ({
      clusterId: id,
      ...data
    }));
  }
}
