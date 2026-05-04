import { Component, computed, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Observer {
  id: string;
  provider: string;
  weight: number;
  state: string;
  isCorrect: boolean;
  reliabilityScore: number;
  uptime: number;
}

@Component({
  selector: 'sre-consensus-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel-card" [class.certified]="convergenceState === 'FORMALLY_STABLE'">
      <div class="chaos-overlay" *ngIf="isChaosMode">
        <div class="chaos-text">CHAOS AUDIT IN PROGRESS</div>
      </div>
      
      <div class="panel-header">
        <div class="title-group">
          <h3>CONSENSUS TOPOLOGY</h3>
          <div class="certified-badge" *ngIf="convergenceState === 'FORMALLY_STABLE'">
            LEVEL 5.0 CERTIFIED
          </div>
        </div>
        <div class="state-pill" [class]="governance?.mode?.toLowerCase()">
          {{ governance?.mode || 'STABLE' }}
        </div>
        <div class="diversity-status" [class.active]="diversityMet">
          <span class="diversity-label">{{ diversityMet ? 'PROVIDER DIVERSITY MET' : 'DIVERSITY GAP' }}</span>
          <span class="diversity-ratio">({{ providersSeen }}/{{ providersRequired }} GROUPS)</span>
        </div>
      </div>

      <div class="quorum-summary">
        <div class="quorum-count">
          <span class="count">{{ agreeingCount() }}</span>
          <span class="total">/ {{ totalObservers() }} NODES</span>
        </div>
        <div class="confidence-decomposition">
          <div class="decomposition-item">
            <label>QUORUM</label>
            <div class="mini-bar"><div class="fill" [style.width.%]="quorumScore() * 100"></div></div>
          </div>
          <div class="decomposition-item">
            <label>DIVERSITY</label>
            <div class="mini-bar"><div class="fill" [style.width.%]="diversityScore() * 100"></div></div>
          </div>
          <div class="decomposition-item">
            <label>STABILITY</label>
            <div class="mini-bar"><div class="fill" [style.width.%]="stabilityScore() * 100"></div></div>
          </div>
        </div>
      </div>

      <div class="weighted-total">
         <label>TOTAL WEIGHTED CONFIDENCE</label>
         <div class="total-value">{{ (weightedConfidence() * 100).toFixed(0) }}%</div>
      </div>

      <div class="observer-list">
        <div class="observer-item" *ngFor="let obs of observers">
          <div class="obs-info">
            <span class="obs-id">{{ obs.id }}</span>
            <span class="obs-provider">{{ obs.provider }}</span>
          </div>
          <div class="obs-reliability" title="Reliability Curve">
            <div class="reliability-bar" [style.width.%]="obs.reliabilityScore * 100" [class.low]="obs.reliabilityScore < 0.6"></div>
          </div>
          <div class="obs-state" [class.incorrect]="!obs.isCorrect">
            {{ obs.state }}
          </div>
        </div>
      </div>

      <div class="anomaly-alert" *ngIf="anomalyHypothesis.detected">
        <div class="anomaly-info">
          <label>ANOMALY DETECTED (Z: {{ anomalyHypothesis.zScore.toFixed(2) }})</label>
          <div class="anomaly-tag" [class]="anomalyHypothesis.type?.toLowerCase() || 'none'">
            {{ anomalyHypothesis.type || 'STATISTICAL_OUTLIER' }}
          </div>
        </div>
        <div class="accuracy-metrics">
          <span>CONFIDENCE: {{ (anomalyHypothesis.confidence * 100).toFixed(0) }}%</span>
          <span class="support" [class.low]="anomalyHypothesis.support < 30">
            SUPPORT: {{ anomalyHypothesis.support }}
            <span class="unstable-warn" *ngIf="anomalyHypothesis.support < 30">(! UNSTABLE)</span>
          </span>
        </div>
      </div>

      <div class="calibration-footer">
        <div class="cal-item">
          <label>SIGNAL INTEGRITY</label>
          <div class="val" [class]="signalIntegrityState.toLowerCase()">{{ signalIntegrityState }}</div>
          <div class="sub-label" *ngIf="causalCertainty > 0.5">
            CAUSAL CORRELATION: {{ (causalCertainty * 100).toFixed(0) }}%
          </div>
        </div>
        <div class="cal-item">
          <label>ACCURACY (BRIER)</label>
          <div class="val" [class.poor]="brierScore > 0.2">{{ (100 - brierScore * 100).toFixed(1) }}%</div>
        </div>
        <div class="cal-item" *ngIf="calibrationBuffer > 0">
          <label>SAFETY UPLIFT</label>
          <div class="val warning">+{{ (calibrationBuffer * 100).toFixed(0) }}%</div>
        </div>
        <div class="cal-item">
          <label>TUNING STATUS</label>
          <div class="val" [class.calibrating]="tuningMode !== 'LOCKED'">{{ tuningMode }}</div>
          <div class="sub-label" *ngIf="divergenceScore > 0">
            DIVERGENCE (KL): {{ divergenceScore.toFixed(3) }}
          </div>
          <div class="stability-tag" [class]="convergenceState?.toLowerCase()">
            {{ convergenceState || 'STABLE' }}
          </div>
        </div>
      </div>

      <!-- Decision Narrative Panel (v3) -->
      <div class="narrative-panel glass-panel" *ngIf="governance">
        <div class="narrative-header">
          <span>DECISION NARRATIVE & CAUSAL PROOF</span>
          <div class="causal-badge" *ngIf="governance?.reasoningDecomposition?.causalTrigger">
            {{ governance.reasoningDecomposition.causalTrigger }}
          </div>
        </div>
        
        <div class="narrative-content">
          <div class="primary-reason">
            <div class="icon">🔍</div>
            <p>{{ governance.reason }}</p>
          </div>

          <!-- Counterfactual Insight: Ranked Blockers (v1.1) -->
          <div class="blockers-layer" *ngIf="rankedBlockers.length > 0">
            <div class="cf-label">TOP DECISION BLOCKERS</div>
            <div class="blocker-item" *ngFor="let b of rankedBlockers">
              <div class="b-info">
                <span class="b-name">{{ b.reason }}</span>
                <span class="b-impact text-low">+{{ (b.impact * 100).toFixed(0) }}% UNCERTAINTY</span>
              </div>
              <div class="b-bar"><div class="fill" [style.width.%]="b.impact * 100"></div></div>
            </div>
          </div>

          <div class="uncertainty-profile">
            <div class="cf-label">UNCERTAINTY PROFILE</div>
            <div class="profile-grid">
              <div class="p-item">
                <label>QUORUM</label>
                <div class="dot" [class.high]="(governance?.reasoningDecomposition?.quorumContribution || 0) < 0.7"></div>
              </div>
              <div class="p-item">
                <label>DIVERSITY</label>
                <div class="dot" [class.high]="(governance?.reasoningDecomposition?.diversityFactor || 0) < 0.5"></div>
              </div>
              <div class="p-item">
                <label>SIGNAL</label>
                <div class="dot" [class.high]="brierScore > 0.15"></div>
              </div>
            </div>
          </div>

          <div class="buffer-indicator">
            <span class="buffer-label">EPISTEMIC SAFETY BUFFER:</span>
            <span class="buffer-val text-warning">+{{ ((governance?.reasoningDecomposition?.safetyBuffer || 0) * 100).toFixed(1) }}%</span>
            <span class="buffer-desc"> (Brier-Derived Uplift)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel-card {
      position: relative;
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 24px;
    }
    .panel-card.certified {
      border: 1px solid rgba(16, 185, 129, 0.4);
      background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.05), transparent 40%),
                  rgba(13, 17, 23, 0.95);
    }

    .chaos-overlay {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        45deg,
        rgba(244, 63, 94, 0.05),
        rgba(244, 63, 94, 0.05) 10px,
        transparent 10px,
        transparent 20px
      );
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      .chaos-text {
        font-size: 24px;
        font-weight: 900;
        color: rgba(244, 63, 94, 0.2);
        letter-spacing: 0.5em;
        transform: rotate(-15deg);
      }
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      
      .title-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .certified-badge {
        font-size: 9px;
        padding: 3px 8px;
        border-radius: 4px;
        background: #10b981;
        color: #fff;
        font-weight: 700;
        box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
      }
    }
    label {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 0.1em;
    }
    .quorum-summary {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 32px;
      margin-bottom: 32px;
      align-items: center;
    }
    .quorum-count .count {
      font-size: 32px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .quorum-count .total {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      margin-left: 8px;
    }
    .observer-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .observer-item {
      display: grid;
      grid-template-columns: 150px 1fr 100px;
      align-items: center;
      gap: 16px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 6px;
    }
    .obs-id { display: block; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
    .obs-provider { display: block; font-size: 10px; color: rgba(255, 255, 255, 0.4); }
    .obs-weight { height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 2px; }
    .weight-bar { height: 100%; background: #6366f1; border-radius: 2px; }
    .obs-state { font-size: 12px; text-align: right; color: #6ee7b7; }
    .obs-state.incorrect { color: #fca5a5; }
    .obs-reliability { height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 2px; position: relative; }
    .reliability-bar { height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s ease; }
    .reliability-bar.low { background: #f59e0b; }
    
    .anomaly-alert {
      margin-top: 24px;
      padding: 12px;
      background: rgba(244, 63, 94, 0.1);
      border-radius: 8px;
      border-left: 4px solid #f43f5e;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .anomaly-info {
      display: flex;
      justify-content: space-between;
      width: 100%;
      align-items: center;
    }
    .anomaly-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .anomaly-tag.noise { background: #3b82f6; color: white; }
    .anomaly-tag.gray_failure { background: #f59e0b; color: white; }
    .anomaly-tag.hard_failure { background: #ef4444; color: white; }

    .calibration-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }
    .cal-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .cal-item label {
      font-size: 10px;
      opacity: 0.6;
      letter-spacing: 0.05em;
    }
    .cal-item .val {
      font-size: 12px;
      font-weight: 700;
      color: #10b981;
    }
    .cal-item .val.poor { color: #f43f5e; }
    .accuracy-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 9px;
      opacity: 0.5;
      margin-top: 8px;
      letter-spacing: 0.05em;

      .support.low {
        color: #f59e0b;
        opacity: 1;
      }
      .unstable-warn {
        margin-left: 4px;
        font-weight: bold;
      }
    }
    .val.nominal { color: #10b981; }
    .val.degraded { color: #f59e0b; }
    .val.critical { color: #f43f5e; }
    .val.calibrating { color: #3b82f6; text-shadow: 0 0 10px rgba(59, 130, 246, 0.5); }
    
    .stability-tag {
      font-size: 7px;
      padding: 2px 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.05);
      margin-top: 4px;
      display: inline-block;
      &.formally_stable { color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
      &.converging { color: #3b82f6; }
      &.oscillating { color: #f43f5e; }
    }

    .narrative-panel {
      margin-top: 24px;
      padding: 16px;
      
      .narrative-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        letter-spacing: 0.1em;
        opacity: 0.4;
        font-weight: 700;
        margin-bottom: 16px;
        
        .causal-badge {
          background: hsl(var(--color-converging) / 0.1);
          color: hsl(var(--color-converging));
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8px;
        }
      }

      .primary-reason {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        .icon { font-size: 16px; }
        p { font-size: 13px; line-height: 1.5; color: #fff; margin: 0; }
      }

      .counterfactual, .blockers-layer {
        background: rgba(255,255,255,0.03);
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        .cf-label { font-size: 8px; opacity: 0.4; font-weight: 800; margin-bottom: 8px; letter-spacing: 0.1em; }
        
        .blocker-item {
          margin-bottom: 12px;
          .b-info {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 4px;
            .b-name { opacity: 0.8; }
          }
          .b-bar {
            height: 3px;
            background: rgba(255,255,255,0.05);
            border-radius: 1px;
            .fill { height: 100%; background: hsl(var(--color-critical)); }
          }
        }
      }

      .uncertainty-profile {
        margin-bottom: 20px;
        .cf-label { font-size: 8px; opacity: 0.4; font-weight: 800; margin-bottom: 8px; letter-spacing: 0.1em; }
        .profile-grid {
          display: flex;
          gap: 20px;
          .p-item {
            display: flex;
            align-items: center;
            gap: 6px;
            label { font-size: 8px; font-weight: 600; opacity: 0.5; }
            .dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: hsl(var(--color-stable));
              &.high { background: hsl(var(--color-critical)); }
            }
          }
        }
      }

      .decomposition-bars {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
        
        .bar-group {
          .bar-label {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            opacity: 0.5;
            margin-bottom: 6px;
          }
          .bar-track {
            height: 4px;
            background: rgba(255,255,255,0.05);
            border-radius: 2px;
            overflow: hidden;
            .fill { height: 100%; background: hsl(var(--color-converging)); }
          }
        }
      }

      .buffer-indicator {
        font-size: 10px;
        border-top: 1px solid rgba(255,255,255,0.05);
        padding-top: 12px;
        .buffer-label { opacity: 0.4; }
        .buffer-val { font-weight: 700; margin-left: 4px; }
        .buffer-desc { font-size: 9px; opacity: 0.3; }
      }
    }
    /* ... existing styles ... */
    .diversity-status {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .diversity-ratio {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      color: rgba(255, 255, 255, 0.4);
    }
    .confidence-decomposition {
      display: flex;
      gap: 16px;
    }
    .decomposition-item {
      flex: 1;
    }
    .mini-bar {
      height: 2px;
      background: rgba(255, 255, 255, 0.05);
      margin-top: 4px;
    }
    .mini-bar .fill {
      height: 100%;
      background: #4f46e5;
    }
    .weighted-total {
      margin-top: 24px;
      margin-bottom: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .total-value {
      font-size: 24px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: #818cf8;
    }
  `]
})
export class ConsensusPanelComponent {
  @Input() observers: Observer[] = [];
  @Input() diversityMet = false;
  @Input() providersSeen = 0;
  @Input() providersRequired = 3;
  @Input() anomalyHypothesis = { detected: false, zScore: 0, confidence: 1.0, type: 'NONE', support: 100 };
  @Input() brierScore = 0;
  @Input() signalQuality = 1.0;
  @Input() signalIntegrityState: 'NOMINAL' | 'DEGRADED' | 'CRITICAL' = 'NOMINAL';
  @Input() causalCertainty = 0;
  @Input() calibrationBuffer = 0;
  @Input() divergenceScore = 0;
  @Input() tuningMode: 'LOCKED' | 'ANALYSIS' | 'TUNING' | 'CALIBRATED' = 'LOCKED';
  @Input() convergenceState?: 'INITIALIZING' | 'CONVERGING' | 'OSCILLATING' | 'FORMALLY_STABLE';
  @Input() governance?: any;
  @Input() rankedBlockers: { reason: string, impact: number }[] = [];
  @Input() isChaosMode = false;
  
  quorumScore = signal<number>(0.8);
  diversityScore = signal<number>(0.6);
  stabilityScore = signal<number>(1.0);

  agreeingCount = computed(() => this.observers.filter(o => o.isCorrect).length);
  totalObservers = computed(() => this.observers.length);
  
  weightedConfidence = computed(() => {
    const totalWeight = this.observers.reduce((acc, o) => acc + o.weight, 0);
    const correctWeight = this.observers.filter(o => o.isCorrect).reduce((acc, o) => acc + o.weight, 0);
    return totalWeight > 0 ? correctWeight / totalWeight : 0;
  });
}



