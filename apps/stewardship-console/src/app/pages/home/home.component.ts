import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StewardshipService } from '../../stewardship.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="h-main">
          <h1>Institutional Continuity Proving Ground</h1>
          <p>Centralized runtime control for adversarial stewardship and sociotechnical validation drills.</p>
        </div>
        <div class="h-status">
          <span class="status-tag freeze">CONSTITUTIONAL FREEZE // ACTIVE</span>
          <button class="reset-btn" (click)="reset()">RESET GLOBAL STATE</button>
        </div>
      </header>

      <!-- TOP LINE INSTITUTIONAL STATUS GRID -->
      <div class="home-grid">
        <section class="stat-card primary">
          <div class="s-label">EPISTEMIC TRUST LEVEL</div>
          <div class="s-val" [class.stable]="(state$ | async)?.trustLevel === 'VERIFIED'" 
                             [class.degraded]="(state$ | async)?.trustLevel === 'DEGRADED'"
                             [class.critical]="(state$ | async)?.trustLevel === 'UNTRUSTED'">
            {{ (state$ | async)?.trustLevel }}
          </div>
          <div class="s-meta">Active Epoch Baseline: {{ (state$ | async)?.epoch }}</div>
        </section>

        <section class="stat-card">
          <div class="s-label">DECISION LATENCY</div>
          <div class="s-val" [class.warning]="((state$ | async)?.decisionLatency ?? 0) > 6">
            {{ (state$ | async)?.decisionLatency }}s
          </div>
          <div class="s-meta">Operational SLA Threshold: &lt; 5s</div>
        </section>

        <section class="stat-card">
          <div class="s-label">HABITUATION RISK</div>
          <div class="s-val" [class.warning]="((state$ | async)?.habituationRisk ?? 0) > 30"
                             [class.critical]="((state$ | async)?.habituationRisk ?? 0) > 75">
            {{ (state$ | async)?.habituationRisk }}%
          </div>
          <div class="s-meta">Sociological Drift Confidence: {{ ((state$ | async)?.habituationRisk ?? 0) > 30 ? 'CRITICAL' : 'SAFE' }}</div>
        </section>

        <section class="stat-card">
          <div class="s-label">RITUAL INTEGRITY</div>
          <div class="s-val" [class.stable]="((state$ | async)?.ritualIntegrity ?? 0) > 75"
                             [class.warning]="((state$ | async)?.ritualIntegrity ?? 0) <= 75">
            {{ (state$ | async)?.ritualIntegrity }}%
          </div>
          <div class="s-meta">Ceremony Validation: {{ ((state$ | async)?.ritualIntegrity ?? 0) > 75 ? 'PASSED' : 'DECAYED' }}</div>
        </section>
      </div>

      <!-- MAIN SPLIT WORKSPACE -->
      <div class="adversarial-layout">
        
        <!-- LEFT COLUMN: DRILLS ENGINE AND AGE SIMULATOR -->
        <div class="left-column">
          <!-- DRILLS SELECTION PANEL -->
          <section class="adversarial-panel">
            <div class="panel-header">
              <h3>ADVERSARIAL STEWARDSHIP PANEL</h3>
              <p>Inject operational stress transitions to test institutional resilience, manual overrides, and trust recovery.</p>
            </div>

            <div class="drill-grid">
              <div *ngFor="let drill of (state$ | async)?.drills" 
                   class="drill-card" 
                   [class.active]="drill.status === 'ACTIVE'"
                   [class.passed]="drill.status?.includes('PASSED')">
                <div class="d-info">
                  <div class="d-header">
                    <span class="d-id">{{ drill.id }}</span>
                    <span class="d-status-tag" [class]="drill.status">{{ drill.status }}</span>
                  </div>
                  <span class="d-name">{{ drill.name }}</span>
                  <p class="d-desc">{{ drill.description }}</p>
                </div>
                <div class="d-footer">
                  <span class="d-last">Last Run: {{ drill.lastRun }}</span>
                  <button class="d-btn" 
                          [disabled]="(state$ | async)?.activeDrill !== 'NONE'" 
                          (click)="triggerDrill(drill.id)">
                    {{ drill.status === 'ACTIVE' ? 'ACTIVE' : 'TRIGGER' }}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- LONGITUDINAL AGING PANEL -->
          <section class="aging-panel">
            <div class="panel-header">
              <h3>LONGITUDINAL AGING SIMULATION</h3>
              <p>Simulate months of continuous platform aging. Verify latency degradation, ledger accumulation, dependency drifts, and operator fatigue over extended time horizons.</p>
            </div>
            
            <div class="aging-controls">
              <div class="aging-card" (click)="simulateAge(90)">
                <div class="age-title">+90 DAYS</div>
                <div class="age-desc">Simulates ledger growth, moderate entropy, minor key decay, and increases baseline latency.</div>
                <button class="age-btn">SIMULATE AGING</button>
              </div>

              <div class="aging-card hard" (click)="simulateAge(180)">
                <div class="age-title">+180 DAYS</div>
                <div class="age-desc">Simulates substantial database scale-up, deep operator drift, ritual erosion, and higher latency levels.</div>
                <button class="age-btn">SIMULATE AGING</button>
              </div>
            </div>
          </section>
        </div>

        <!-- RIGHT COLUMN: SYSTEM GUIDELINES & DRILL DOCUMENTATION -->
        <aside class="doctrine-aside">
          
          <!-- SYSTEM STATE CALLOUT -->
          <div class="doctrine-card highlight" *ngIf="(state$ | async)?.activeDrill === 'NONE'">
            <h3>STEWARDSHIP STATUS: SYSTEM NOMINAL</h3>
            <p>The continuity framework is currently resting in <strong>PASSIVE-OBSERVATION</strong> mode. No active disruptions injected. Run an adversarial drill to begin reality verification.</p>
          </div>

          <!-- ACTIVE DRILL CONTEXT CARD -->
          <div class="doctrine-card critical flash-border" *ngIf="(state$ | async)?.activeDrill !== 'NONE'">
            <h3>⚠️ FAILURE DRILL ACTIVE</h3>
            <div class="active-drill-info">
              <label>INJECTED EVENT</label>
              <div class="title">{{ (state$ | async)?.activeDrill }}</div>
              <p>The system is physically mutating. Navigate through the sidebar navigation to triage: </p>
              
              <ul class="nav-links" *ngIf="(state$ | async)?.activeDrill === 'IFD-001'">
                <li>Verify <strong>UNTRUSTED</strong> header state.</li>
                <li>Inspect forged block entries in the <a href="/replay">Replay Explorer</a>.</li>
                <li>Go to the <a href="/recovery">Recovery Console</a> to see that standard restores are blocked.</li>
              </ul>

              <ul class="nav-links" *ngIf="(state$ | async)?.activeDrill === 'IFD-002'">
                <li>Observe chronology gaps in the <a href="/replay">Replay Explorer</a> timeline.</li>
                <li>Inspect structural failures on the <a href="/recovery">Recovery Console</a>.</li>
              </ul>

              <ul class="nav-links" *ngIf="(state$ | async)?.activeDrill === 'IFD-003'">
                <li>Observe the <strong>DEGRADED</strong> trust state.</li>
                <li>Notice <strong>SUPERVISOR</strong> accountability locks.</li>
                <li>Navigate to the <a href="/recovery">Recovery Console</a> to view accountability-bound escalation restrictions.</li>
              </ul>

              <ul class="nav-links" *ngIf="(state$ | async)?.activeDrill === 'RITUAL_DECAY'">
                <li>Examine rubber-stamping records in <a href="/governance">Epoch Registry</a>.</li>
                <li>Look at the high habituation risk in <a href="/stewardship">Stewardship Hub</a>.</li>
              </ul>

              <ul class="nav-links" *ngIf="(state$ | async)?.activeDrill === 'FREEZE_PRESSURE'">
                <li>Review high-risk automated proposals in the <a href="/stewardship">Stewardship Hub</a> queue.</li>
                <li>Reject or prune capability extensions to verify system restraint.</li>
              </ul>

              <ul class="nav-links" *ngIf="(state$ | async)?.activeDrill === 'TOTAL_QUORUM_FAILURE'">
                <li>Complete quorum breakdown. Navigate to <a href="/recovery">Recovery Console</a> to initiate a heavy, multi-operator HSM manual override ceremony.</li>
              </ul>
            </div>
          </div>

          <div class="doctrine-card">
            <h3>DISCIPLINED PROVISIONALITY</h3>
            <p>Every feature in the Nexus ZTAN environment must remain locked under the <strong>Active Architecture Freeze</strong>. We believe in strict mechanical finality, relying strictly on human-in-the-loop validation over autonomous algorithms.</p>
          </div>

          <div class="doctrine-card info">
            <h3>OPERATOR RESPONSE LATENCY</h3>
            <p>Reaction speed measures the cognitive capability of our operators. When drills trigger, an automated timer calculates latency. A response time of less than <strong>5 seconds</strong> represents elite organizational posture.</p>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .page-container { padding: 2rem; height: 100%; overflow-y: auto; box-sizing: border-box; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
    h1 { font-size: 1.3rem; font-weight: 800; margin: 0 0 0.5rem 0; letter-spacing: -0.01em; color: #f3f4f6; }
    p { font-size: 0.85rem; color: #9ca3af; margin: 0; }

    .h-status { display: flex; gap: 1rem; align-items: center; }
    .status-tag.freeze { font-size: 0.6rem; font-weight: 900; color: #10b981; border: 1px solid #064e3b; background: rgba(16, 185, 129, 0.05); padding: 4px 8px; border-radius: 2px; }
    .reset-btn { background: #111827; border: 1px solid #374151; color: #9ca3af; font-size: 0.6rem; font-weight: 800; padding: 5px 10px; cursor: pointer; border-radius: 4px; transition: background 0.2s; }
    .reset-btn:hover { background: #1f2937; color: #f3f4f6; }

    .home-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-bottom: 2.5rem; }
    .stat-card { background: #030712; border: 1px solid #111827; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; border-radius: 8px; }
    .stat-card.primary { border-left: 3px solid #10b981; }
    .s-label { font-size: 0.55rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    .s-val { font-size: 1.5rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #f3f4f6; }
    .s-val.stable { color: #10b981; }
    .s-val.degraded { color: #f59e0b; }
    .s-val.critical { color: #ef4444; }
    .s-val.warning { color: #f59e0b; }
    .s-meta { font-size: 0.65rem; color: #4b5563; font-weight: 600; }

    .adversarial-layout { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
    .left-column { display: flex; flex-direction: column; gap: 1.5rem; }
    
    .adversarial-panel, .aging-panel { background: #090d16; border: 1px solid #111827; padding: 1.5rem; border-radius: 8px; }
    .panel-header { margin-bottom: 1.5rem; }
    h3 { font-size: 0.7rem; font-weight: 800; color: #9ca3af; margin: 0 0 0.5rem 0; letter-spacing: 0.05em; text-transform: uppercase; }
    
    .drill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .drill-card { background: #030712; border: 1px solid #1f2937; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border-left: 3px solid #374151; border-radius: 6px; }
    .drill-card.active { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.02); }
    .drill-card.passed { border-left-color: #10b981; }
    
    .d-header { display: flex; justify-content: space-between; align-items: center; }
    .d-id { font-size: 0.55rem; font-weight: 900; color: #6b7280; font-family: 'JetBrains Mono'; }
    
    .d-status-tag { font-size: 0.5rem; font-weight: 900; padding: 1px 4px; border-radius: 2px; border: 1px solid; }
    .d-status-tag.INACTIVE { color: #6b7280; border-color: #374151; background: rgba(0,0,0,0.1); }
    .d-status-tag.ACTIVE { color: #ef4444; border-color: #7f1d1d; background: rgba(239, 68, 68, 0.05); animation: flash 1s infinite alternate; }
    .d-status-tag.PASSED { color: #10b981; border-color: #064e3b; background: rgba(16, 185, 129, 0.05); }

    .d-name { font-size: 0.8rem; font-weight: 800; color: #e5e7eb; margin: 0.25rem 0; }
    .d-desc { font-size: 0.7rem; color: #6b7280; line-height: 1.4; margin: 0; }

    .d-footer { margin-top: 1.25rem; display: flex; justify-content: space-between; align-items: center; }
    .d-last { font-size: 0.6rem; color: #4b5563; font-weight: 700; font-family: 'JetBrains Mono'; }
    .d-btn { background: #111827; border: 1px solid #374151; color: #e5e7eb; font-size: 0.65rem; font-weight: 800; padding: 4px 10px; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
    .d-btn:hover:not(:disabled) { background: #ef4444; border-color: #ef4444; color: white; }
    .d-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    /* Aging simulation styles */
    .aging-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .aging-card { background: #030712; border: 1px solid #1f2937; padding: 1.25rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 0.5rem; }
    .aging-card:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.02); }
    .aging-card.hard:hover { border-color: #f59e0b; background: rgba(245, 158, 11, 0.02); }
    .age-title { font-size: 0.95rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #3b82f6; }
    .aging-card.hard .age-title { color: #f59e0b; }
    .age-desc { font-size: 0.7rem; color: #6b7280; line-height: 1.4; flex-grow: 1; }
    .age-btn { background: #111827; border: 1px solid #374151; color: #cbd5e1; font-size: 0.65rem; font-weight: 800; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: fit-content; margin-top: 0.5rem; }

    .doctrine-aside { display: flex; flex-direction: column; gap: 1.5rem; }
    .doctrine-card { background: #090d16; border: 1px solid #111827; padding: 1.25rem; border-radius: 8px; }
    .doctrine-card.highlight { border-left: 3px solid #3b82f6; background: rgba(59, 130, 246, 0.01); }
    .doctrine-card.critical { border-left: 3px solid #ef4444; background: rgba(239, 68, 68, 0.02); }
    .doctrine-card.info { border-left: 3px solid #94a3b8; }
    
    .active-drill-info label { font-size: 0.5rem; font-weight: 900; color: #ef4444; letter-spacing: 0.05em; display: block; margin-top: 0.5rem; }
    .active-drill-info .title { font-size: 1rem; font-weight: 900; font-family: 'JetBrains Mono'; color: #ef4444; margin-bottom: 0.5rem; }
    .active-drill-info p { font-size: 0.75rem; color: #e5e7eb; line-height: 1.4; }
    
    .nav-links { padding-left: 1.2rem; margin: 0.5rem 0 0 0; }
    .nav-links li { font-size: 0.75rem; color: #cbd5e1; margin-bottom: 0.4rem; line-height: 1.3; }
    .nav-links a { color: #f59e0b; text-decoration: none; font-weight: 700; }
    .nav-links a:hover { text-decoration: underline; }

    .doctrine-card p { font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; margin-top: 0.5rem; }
    
    .flash-border { animation: borderFlash 1.5s infinite alternate; }

    @keyframes flash {
      from { opacity: 0.4; }
      to { opacity: 1; }
    }
    @keyframes borderFlash {
      from { border-color: #111827; }
      to { border-color: #ef4444; }
    }
  `]
})
export class HomeComponent {
  private stewardship = inject(StewardshipService);
  state$ = this.stewardship.state$;

  triggerDrill(id: string) {
    this.stewardship.triggerDrill(id);
  }

  simulateAge(days: number) {
    this.stewardship.simulateAging(days);
  }

  reset() {
    this.stewardship.resetState();
  }
}
