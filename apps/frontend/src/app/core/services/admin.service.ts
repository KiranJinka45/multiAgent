import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

export interface ScalingDecision {
  id: string;
  type: string;
  strategy: string;
  reason: string;
  roi: number | null;
  improvementPct: number | null;
  metrics: any;
  createdAt: string;
}

export interface IntelligenceState {
  activeStrategies: Record<string, number>;
  systemStatus: string;
  lastScalingEvent: ScalingDecision | null;
}

export interface ROIMetrics {
  optimizations: number;
  failureRate: number;
  estimatedSavings: number;
  efficiencyGain: number;
  devHoursSaved: number;
  profitability: number;
  // Beta Engagement Tracking
  activationRate: number; // % of users with > 3 missions
  avgTimeToFirstSuccess: number; // minutes
  churnRisk: number; // % of users inactive for > 48h
  engagementScore: number; // 0-100 based on usage depth
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `/admin/intelligence`;

  constructor(private api: ApiService) {}

  getROIMetrics(tenantId?: string): Observable<ROIMetrics> {
    const url = tenantId ? `${this.apiUrl}/roi?tenantId=${tenantId}` : `${this.apiUrl}/roi`;
    return this.api.get<{ data: ROIMetrics }>(url).pipe(map(res => res.data));
  }

  getScalingTimeline(): Observable<ScalingDecision[]> {
    return this.api.get<{ data: ScalingDecision[] }>(`${this.apiUrl}/timeline`).pipe(map(res => res.data));
  }

  getIntelligenceState(): Observable<IntelligenceState> {
    return this.api.get<{ data: IntelligenceState }>(`${this.apiUrl}/state`).pipe(map(res => res.data));
  }

  updatePolicy(tenantId: string, updates: any): Observable<any> {
    return this.api.patch(`${this.apiUrl}/policy?tenantId=${tenantId}`, updates);
  }

  getTenantBilling(tenantId: string): Observable<any> {
    return this.api.get<{ data: any }>(`${this.apiUrl}/billing/tenant/${tenantId}`).pipe(map(res => res.data));
  }

  getTenantSummary(): Observable<any[]> {
    return this.api.get<{ data: any[] }>(`${this.apiUrl}/tenants/summary`).pipe(map(res => res.data));
  }

  getAlerts(): Observable<any[]> {
    return this.api.get<{ data: any[] }>(`${this.apiUrl}/alerts`).pipe(map(res => res.data));
  }
}
