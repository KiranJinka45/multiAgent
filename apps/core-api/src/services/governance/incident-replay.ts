import { SREUpdate } from '@packages/contracts';
import { redis } from '@packages/utils';

export class IncidentReplayService {
  private static KEY_PREFIX = 'sre:incident:trace:';

  /**
   * Records a snapshot of the full system state during an incident.
   */
  public static async recordSnapshot(incidentId: string, state: SREUpdate) {
    const key = `${this.KEY_PREFIX}${incidentId}`;
    await redis.rpush(key, JSON.stringify(state));
    await redis.expire(key, 86400 * 7); // Keep traces for 7 days
  }

  /**
   * Retrieves all snapshots for a specific incident to enable scrubbing.
   */
  public static async getReplay(incidentId: string): Promise<SREUpdate[]> {
    const key = `${this.KEY_PREFIX}${incidentId}`;
    const raw = await redis.lrange(key, 0, -1);
    return raw.map(r => JSON.parse(r));
  }
}
