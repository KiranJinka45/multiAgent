import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MissionFacade } from '../missions/mission.facade';
import { map } from 'rxjs';

@Component({
  selector: 'app-timeline-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <h1>System Timeline</h1>
      <div class="subtitle">Global execution events across all active missions</div>
    </div>

    <div class="timeline-container" *ngIf="timelineEvents$ | async as events">
      <div class="timeline-event" *ngFor="let event of events; let i = index" [style.animation-delay]="i * 0.1 + 's'">
        <div class="event-marker" [ngClass]="event.type">
          <span class="icon">{{ getEventIcon(event.type) }}</span>
        </div>
        <div class="event-content card">
          <div class="event-header">
            <span class="event-type" [ngClass]="event.type">{{ formatType(event.type) }}</span>
            <span class="event-time">{{ event.timestamp | date:'short' }}</span>
          </div>
          <p class="event-desc">
            Mission <code>{{ event.missionId.substring(0, 8) }}</code> 
            <span class="action-text">{{ event.message }}</span>
          </p>
        </div>
      </div>
      
      <div class="empty-state" *ngIf="events.length === 0">
        <div class="empty-icon">📭</div>
        <p>No timeline events available.</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; animation: fadeIn 0.5s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .page-header { margin-bottom: 40px; }
    h1 { color: #f8fafc; margin: 0 0 8px 0; font-size: 2rem; font-weight: 700; letter-spacing: -0.5px; }
    .subtitle { color: #94a3b8; font-size: 0.9rem; }
    
    .timeline-container {
      position: relative;
      padding-left: 48px;
      max-width: 800px;
    }
    .timeline-container::before {
      content: '';
      position: absolute;
      left: 19px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(180deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.1));
    }
    
    .timeline-event {
      position: relative;
      margin-bottom: 32px;
      opacity: 0;
      animation: slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    .event-marker {
      position: absolute;
      left: -48px;
      top: 16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #0f172a;
      border: 2px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
      box-shadow: 0 0 15px rgba(0,0,0,0.5);
      transition: all 0.3s ease;
    }
    .timeline-event:hover .event-marker {
      transform: scale(1.1);
    }
    .event-marker.started { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59,130,246,0.3); }
    .event-marker.completed { border-color: #10b981; box-shadow: 0 0 15px rgba(16,185,129,0.3); }
    .event-marker.failed { border-color: #ef4444; box-shadow: 0 0 15px rgba(239,68,68,0.3); }
    .event-marker.log { border-color: #8b5cf6; }
    
    .event-marker .icon { font-size: 1.1rem; }
    
    .card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px 24px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      border-color: rgba(255,255,255,0.15);
    }
    
    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .event-type {
      font-weight: 800;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 4px;
      background: rgba(255,255,255,0.05);
    }
    .event-type.started { color: #60a5fa; background: rgba(59,130,246,0.1); }
    .event-type.completed { color: #34d399; background: rgba(16,185,129,0.1); }
    .event-type.failed { color: #f87171; background: rgba(239,68,68,0.1); }
    .event-type.log { color: #a78bfa; background: rgba(139,92,246,0.1); }
    
    .event-time {
      font-size: 0.75rem;
      font-weight: 500;
      color: #64748b;
    }
    
    .event-desc {
      color: #cbd5e1;
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }
    code {
      background: rgba(0,0,0,0.4);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #94a3b8;
    }
    .action-text {
      color: #f8fafc;
    }
    
    .empty-state {
      text-align: center;
      padding: 64px 0;
      color: #64748b;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      opacity: 0.5;
    }
  `]
})
export class TimelineViewComponent {
  private facade = inject(MissionFacade);

  timelineEvents$ = this.facade.missions$.pipe(
    map(missions => {
      const events: any[] = [];
      
      missions.forEach(m => {
        // Add start event
        events.push({
          type: 'started',
          missionId: m.id,
          timestamp: m.createdAt,
          message: 'initialized by gateway'
        });
        
        // Add completion/failure events
        if (m.status === 'completed') {
          events.push({
            type: 'completed',
            missionId: m.id,
            timestamp: m.updatedAt || m.createdAt,
            message: 'successfully completed execution'
          });
        } else if (m.status === 'failed') {
          events.push({
            type: 'failed',
            missionId: m.id,
            timestamp: m.updatedAt || m.createdAt,
            message: `failed: ${m.failureReason || 'Unknown error'}`
          });
        }
        
        // Add logs
        if (m.logs && m.logs.length > 0) {
          m.logs.forEach(log => {
            events.push({
              type: 'log',
              missionId: m.id,
              timestamp: log.timestamp,
              message: log.message
            });
          });
        }
      });
      
      // Sort by timestamp descending
      return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50); // Keep latest 50
    })
  );

  getEventIcon(type: string): string {
    switch (type) {
      case 'started': return '🚀';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'log': return '📝';
      default: return '🔹';
    }
  }

  formatType(type: string): string {
    return type.toUpperCase();
  }
}
