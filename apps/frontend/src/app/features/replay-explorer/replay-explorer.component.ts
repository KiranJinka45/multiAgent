import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SreDataService } from '../../core/services/sre-data.service';
import { TrustRailComponent } from './components/trust-rail/trust-rail.component';
import { EpochTimelineComponent } from './components/epoch-timeline/epoch-timeline.component';
import { EvidenceStreamComponent } from './components/evidence-stream/evidence-stream.component';
import { ReplayControlsComponent } from './components/replay-controls/replay-controls.component';

@Component({
  selector: 'app-replay-explorer',
  standalone: true,
  imports: [
    CommonModule,
    TrustRailComponent,
    EpochTimelineComponent,
    EvidenceStreamComponent,
    ReplayControlsComponent
  ],
  template: `
    <div class="replay-explorer-host">
      <!-- Layer 1: Trust Rail -->
      <app-trust-rail 
        [state]="verificationState()"
        [metrics]="metrics()">
      </app-trust-rail>

      <div class="explorer-main-layout">
        <div class="timeline-surface">
          <!-- Layer 2: Epoch Timeline -->
          <app-epoch-timeline [chain]="evidenceChain()"></app-epoch-timeline>

          <!-- Layer 3: Causal Evidence Stream -->
          <app-evidence-stream [chain]="evidenceChain()"></app-evidence-stream>
        </div>

        <!-- Layer 5: Deterministic Replay Controls -->
        <div class="control-sidebar">
          <app-replay-controls></app-replay-controls>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .replay-explorer-host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: hsl(var(--bg-app));
      overflow: hidden;
    }

    .explorer-main-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      flex: 1;
      overflow: hidden;
    }

    .timeline-surface {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 1.5rem;
      gap: 1.5rem;
    }

    .control-sidebar {
      border-left: 1px solid hsl(var(--border-muted));
      background: hsl(var(--bg-surface));
    }
  `]
})
export class ReplayExplorerComponent {
  private sre = inject(SreDataService);

  public evidenceChain = this.sre.evidenceChain;
  public verificationState = computed(() => this.evidenceChain()?.verificationState || 'unknown');
  public metrics = computed(() => this.evidenceChain()?.metrics);
}
