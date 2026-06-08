import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SessionState {
  sessionId: string;
  ceremonyId: string; // Compatibility field
  masterPublicKey: string;
  threshold: number;
  participants: { nodeId: string, status: string, publicKey?: string }[];
  status: string;
  aggregatedSignature?: string;
  messageHash?: string;
  transcript?: { sequence: number, timestamp: number, nodeId: string, round: string, payloadHash: string }[];
}

export type CeremonyState = SessionState;

export interface Metrics {
  activeNodes: number;
  revokedNodes: number;
  totalSessions: number;
  totalCeremonies: number; // Compatibility field
  successRate: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZtanService {
  constructor(private api: ApiService) {}

  private mapSession(session: SessionState | null): SessionState | null {
    if (session) {
      session.ceremonyId = session.sessionId || session.ceremonyId;
      session.sessionId = session.sessionId || session.ceremonyId;
    }
    return session;
  }

  async getActiveSession(): Promise<SessionState | null> {
    try {
      const res = await firstValueFrom(this.api.get<{ active: SessionState }>('/ztan/session/active'));
      return this.mapSession(res.active);
    } catch (_e) {
      return null;
    }
  }

  async getActiveCeremony(): Promise<CeremonyState | null> {
    return this.getActiveSession();
  }

  async initSession(threshold: number, participants: string[], messageHash: string): Promise<SessionState> {
    const res = await firstValueFrom(this.api.post<SessionState>('/ztan/session/init', { threshold, participants, messageHash }));
    return this.mapSession(res)!;
  }

  async initCeremony(threshold: number, participants: string[], messageHash: string): Promise<CeremonyState> {
    return this.initSession(threshold, participants, messageHash);
  }

  async submitCommitments(msg: any): Promise<SessionState> {
    const res = await firstValueFrom(this.api.post<SessionState>('/ztan/session/commitments', msg));
    return this.mapSession(res)!;
  }

  async submitShares(msg: any): Promise<SessionState> {
    const res = await firstValueFrom(this.api.post<SessionState>('/ztan/session/shares', msg));
    return this.mapSession(res)!;
  }

  async submitSignature(msg: any): Promise<SessionState> {
    const res = await firstValueFrom(this.api.post<SessionState>('/ztan/session/sign', msg));
    return this.mapSession(res)!;
  }

  async simulateSign(nodeId: string): Promise<SessionState> {
    const res = await firstValueFrom(this.api.post<SessionState>('/ztan/session/sign', { nodeId, simulate: true }));
    return this.mapSession(res)!;
  }

  async archive(): Promise<any> {
    return await firstValueFrom(this.api.post<any>('/ztan/archive', {}));
  }

  getMetrics(): Observable<Metrics> {
    return this.api.get<Metrics>('/ztan/metrics').pipe(
      map(m => {
        if (m) {
          m.totalCeremonies = m.totalSessions || m.totalCeremonies;
          m.totalSessions = m.totalSessions || m.totalCeremonies;
        }
        return m;
      })
    );
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.api.post<void>('/ztan/reset', {}));
  }
}
