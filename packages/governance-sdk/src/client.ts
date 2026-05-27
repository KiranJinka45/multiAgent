import axios from 'axios';
import type { EmitEventRequest, GovernanceEventRecord } from './types.js';

export class GovernanceSdkClient {
  private ledgerUrl: string;

  constructor(ledgerUrl?: string) {
    this.ledgerUrl = ledgerUrl || process.env.GOVERNANCE_LEDGER_URL || 'http://localhost:3105';
  }

  async emitEvent(request: EmitEventRequest): Promise<GovernanceEventRecord> {
    try {
      const response = await axios.post(`${this.ledgerUrl}/api/v1/events`, request, { timeout: 5000 });
      return response.data as GovernanceEventRecord;
    } catch (err: any) {
      console.warn(`[GovernanceSdkClient] Failed to emit event ${request.eventType}: ${err.message}`);
      throw err;
    }
  }

  async getEvents(correlationId: string): Promise<GovernanceEventRecord[]> {
    const response = await axios.get(`${this.ledgerUrl}/api/v1/events/${correlationId}`, { timeout: 5000 });
    return response.data.events as GovernanceEventRecord[];
  }
}
