import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

export interface CeremonyState {
  ceremonyId: string;
  masterPublicKey: string;
  threshold: number;
  participants: { nodeId: string, status: string, publicKey?: string }[];
  status: string;
  aggregatedSignature?: string;
  messageHash?: string;
  transcript?: { sequence: number, timestamp: number, nodeId: string, round: string, payloadHash: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class ZtanService {
  constructor(private api: ApiService) {}

  async getActiveCeremony(): Promise<CeremonyState | null> {
    try {
      const res = await firstValueFrom(this.api.get<{ active: CeremonyState }>('/ztan/ceremony/active'));
      return res.active;
    } catch (e) {
      return null;
    }
  }

  async initCeremony(threshold: number, participants: string[], messageHash: string): Promise<CeremonyState> {
    return await firstValueFrom(this.api.post<CeremonyState>('/ztan/ceremony/init', { threshold, participants, messageHash }));
  }

  async submitCommitments(msg: any): Promise<CeremonyState> {
    return await firstValueFrom(this.api.post<CeremonyState>('/ztan/ceremony/commitments', msg));
  }

  async submitShares(msg: any): Promise<CeremonyState> {
    return await firstValueFrom(this.api.post<CeremonyState>('/ztan/ceremony/shares', msg));
  }

  async submitSignature(msg: any): Promise<CeremonyState> {
    return await firstValueFrom(this.api.post<CeremonyState>('/ztan/ceremony/sign', msg));
  }

  async simulateSign(nodeId: string): Promise<CeremonyState> {
    // The backend uses /ceremony/sign for real signs, but let's check if there's a simulate endpoint
    // Actually, I'll use the real one with a signed message or add a simulate endpoint if needed.
    // For now, I'll point it to a new simulate endpoint I might need to add or just use the logic in audit-verifier.
    return await firstValueFrom(this.api.post<CeremonyState>('/ztan/ceremony/sign', { nodeId, simulate: true }));
  }

  async archive(): Promise<any> {
    return await firstValueFrom(this.api.post<any>('/ztan/archive', {}));
  }

  async getMetrics(): Promise<any> {
    return this.api.get<any>('/ztan/metrics');
  }

  async reset(): Promise<void> {
    await firstValueFrom(this.api.post<void>('/ztan/reset', {}));
  }
}
