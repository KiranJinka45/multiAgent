import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, switchMap, tap, merge } from 'rxjs';
import { Mission } from './mission.model';
import { ApiService } from '../../core/services/api.service';
import { WebsocketService } from '../../core/services/websocket.service';

@Injectable({
  providedIn: 'root'
})
export class MissionFacade {
  private missionsSubject = new BehaviorSubject<Mission[]>([]);
  public missions$ = this.missionsSubject.asObservable();
  private lastEventTimestamp: string | null = null;
  private lastSequences: Map<string, string> = new Map();

  constructor(
    private api: ApiService,
    private ws: WebsocketService
  ) {
    // Initial load
    this.loadMissions();
    
    // Polling fallback (less frequent now that we have robust streams)
    interval(30000).pipe(
      switchMap(() => this.api.get<Mission[]>('/missions'))
    ).subscribe(missions => this.missionsSubject.next(missions));

    // Handle real-time updates
    this.ws.onEvent<any>('mission-update').subscribe(update => {
      this.applyUpdate(update);
    });

    // Handle reconnection: TRIGGER REPLAY
    this.ws.reconnected$.subscribe(() => {
      console.log(`[MissionFacade] Reconnected. Triggering replay for active missions...`);
      const activeMissions = this.missionsSubject.value.filter(
        m => m.status === 'running' || m.status === 'retrying'
      );
      
      activeMissions.forEach(m => {
        const lastId = this.lastSequences.get(m.id) || '0';
        this.ws.emit('replay-events', { buildId: m.id, lastId });
      });
      
      // Still load full list to catch new/deleted missions
      this.loadMissions();
    });

    // Handle specific build events
    merge(
      this.ws.onEvent<any>('progress'),
      this.ws.onEvent<any>('thought'),
      this.ws.onEvent<any>('agent'),
      this.ws.onEvent<any>('complete'),
      this.ws.onEvent<any>('error')
    ).subscribe(event => {
      this.handleBuildEvent(event);
    });

    // Gap Detection via Replay Summary
    this.ws.onEvent<{ buildId: string, oldestId: string }>('replay-summary').subscribe(summary => {
      const lastId = this.lastSequences.get(summary.buildId) || '0-0';
      
      // If our last known ID is older than the oldest ID in Redis, we have a gap
      if (this.compareRedisIds(lastId, summary.oldestId) < 0) {
        console.warn(`[MissionFacade] Gap detected for ${summary.buildId} (Last: ${lastId}, Oldest: ${summary.oldestId}). Hard Resyncing...`);
        this.hardResyncMission(summary.buildId);
      }
    });

    // Long-session cleanup (every 1 hour)
    interval(3600000).subscribe(() => this.softRefresh());
  }

  private softRefresh() {
    console.log('[MissionFacade] Performing soft-refresh to prevent state drift.');
    this.loadMissions();
  }

  loadMissions() {
    this.api.get<Mission[]>('/missions').subscribe(
      missions => {
        this.missionsSubject.next(missions);
        // Automatically subscribe to all active missions
        missions.filter(m => m.status === 'running' || m.status === 'retrying')
                .forEach(m => this.ws.subscribeToBuild(m.id));
      }
    );
  }

  createMission(data: any) {
    return this.api.post<Mission>('/missions', data).pipe(
      tap(mission => {
        const current = this.missionsSubject.value;
        this.missionsSubject.next([mission, ...current]);
        this.ws.subscribeToBuild(mission.id);
      })
    );
  }

  private applyUpdate(update: Partial<Mission> & { id: string, updatedAt?: string, sequence?: string, _sequence?: string }) {
    const missions = this.missionsSubject.value;
    const index = missions.findIndex(m => m.id === update.id);
    if (index !== -1) {
      const existing = missions[index];
      const newSequence = update._sequence || update.sequence;
      
      // Strong Correctness: Monotonic Sequencing (Redis Stream IDs)
      if (newSequence && existing.sequence) {
          if (this.compareRedisIds(newSequence, existing.sequence) <= 0) {
            console.warn(`[MissionFacade] Stale sequence ignored for ${update.id} (${newSequence} <= ${existing.sequence})`);
            return;
          }
      }

      if (newSequence) {
        this.lastSequences.set(update.id, newSequence);
        update.sequence = newSequence;
      }

      if (update.updatedAt) {
        if (!this.lastEventTimestamp || new Date(update.updatedAt) > new Date(this.lastEventTimestamp)) {
          this.lastEventTimestamp = update.updatedAt;
        }
      }

      const updatedMissions = [...missions];
      const updatedMission = { ...existing, ...update };
      
      // Log Capping: Prevent memory pressure
      if (updatedMission.logs && updatedMission.logs.length > 500) {
        updatedMission.logs = updatedMission.logs.slice(-500);
      }

      updatedMissions[index] = updatedMission;
      this.missionsSubject.next(updatedMissions);
    } else {
      this.loadMissions();
    }
  }

  /**
   * HARD RESYNC
   * Fetches full chronological history from the Database SSOT.
   * Used when Redis streams are insufficient (e.g., long downtime).
   */
  hardResyncMission(missionId: string) {
    console.log(`[MissionFacade] Performing Hard Resync for mission ${missionId}...`);
    this.api.get<any[]>(`/build-timeline/${missionId}`).subscribe(timeline => {
      const missions = this.missionsSubject.value;
      const index = missions.findIndex(m => m.id === missionId);
      if (index !== -1) {
        const mission = { ...missions[index] };
        
        // Reconstruct logs from scratch
        mission.logs = timeline.map(event => ({
          timestamp: event.timestamp || new Date().toISOString(),
          message: event.message || `[${event.agent || 'System'}] ${event.type}`
        }));

        // Update sequence to latest in timeline
        if (timeline.length > 0) {
          const lastEvent = timeline[timeline.length - 1];
          const seq = lastEvent._sequence || lastEvent.sequence;
          if (seq) {
            this.lastSequences.set(missionId, seq);
            mission.sequence = seq;
          }
        }

        const updatedMissions = [...missions];
        updatedMissions[index] = mission;
        this.missionsSubject.next(updatedMissions);
      }
    });
  }

  private handleBuildEvent(event: any) {
    const missionId = event.executionId;
    if (!missionId) return;

    const missions = this.missionsSubject.value;
    const mission = missions.find(m => m.id === missionId);
    
    if (mission) {
      // Event Ordering Check for specific events
      if (event.timestamp && mission.updatedAt && new Date(event.timestamp) < new Date(mission.updatedAt)) {
        return;
      }

      const update: Partial<Mission> = { 
        id: missionId,
        updatedAt: event.timestamp || new Date().toISOString()
      };
      
      if (event.type === 'complete') update.status = 'completed';
      if (event.type === 'error') {
        update.status = 'failed';
        update.failureReason = event.error;
        update.failureStage = event.stage;
      }
      if (event.type === 'progress') {
        // Handle progress updates if needed
      }

      this.applyUpdate(update as any);
    }
  }

  private compareRedisIds(id1: string, id2: string): number {
    if (id1 === id2) return 0;
    const [t1, s1] = id1.split('-').map(Number);
    const [t2, s2] = id2.split('-').map(Number);
    
    if (t1 !== t2) return t1 - t2;
    return s1 - s2;
  }
}
