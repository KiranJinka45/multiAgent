import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

export interface SessionState {
  sessionId: string;
  masterPublicKey: string;
  threshold: number;
  participants: { nodeId: string, status: string, publicKey?: string }[];
  status: string;
  aggregatedSignature?: string;
  messageHash?: string;
  transcript?: { sequence: number, timestamp: number, nodeId: string, round: string, payloadHash: string }[];
}

export interface Metrics {
  activeNodes: number;
  revokedNodes: number;
  totalSessions: number;
  successRate: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZtanService {
  constructor(private api: ApiService) {}

  async getActiveSession(): Promise<SessionState | null> {
    try {
      const res = await firstValueFrom(this.api.get<{ active: SessionState }>('/ztan/session/active'));
      return res.active;
    } catch (e) {
      return null;
    }
  }

  async initSession(threshold: number, participants: string[], messageHash: string): Promise<SessionState> {
    return await firstValueFrom(this.api.post<SessionState>('/ztan/session/init', { threshold, participants, messageHash }));
  }

  async submitCommitments(msg: any): Promise<SessionState> {
    return await firstValueFrom(this.api.post<SessionState>('/ztan/session/commitments', msg));
  }

  async submitShares(msg: any): Promise<SessionState> {
    return await firstValueFrom(this.api.post<SessionState>('/ztan/session/shares', msg));
  }

  async submitSignature(msg: any): Promise<SessionState> {
    return await firstValueFrom(this.api.post<SessionState>('/ztan/session/sign', msg));
  }

  async simulateSign(nodeId: string): Promise<SessionState> {
    return await firstValueFrom(this.api.post<SessionState>('/ztan/session/sign', { nodeId, simulate: true }));
  }

  async archive(): Promise<any> {
    return await firstValueFrom(this.api.post<any>('/ztan/archive', {}));
  }

  getMetrics(): import('rxjs').Observable<Metrics> {
    return this.api.get<Metrics>('/ztan/metrics');
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.api.post<void>('/ztan/reset', {}));
  }
}
