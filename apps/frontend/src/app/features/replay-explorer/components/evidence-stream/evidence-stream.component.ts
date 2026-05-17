import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvidenceChain, EvidenceEntry } from '@packages/contracts';
import { EvidenceCardComponent } from './evidence-card.component';

@Component({
  selector: 'app-evidence-stream',
  standalone: true,
  imports: [CommonModule, EvidenceCardComponent],
  template: `
    <div class="evidence-stream-host">
      <div class="stream-header">
        <span class="count">{{ chain?.entries?.length || 0 }} Verified Entries</span>
        <div class="filter-bar">
          <!-- Placeholders for future filters -->
          <span class="filter-pill active">All Categories</span>
          <span class="filter-pill">Mutations Only</span>
        </div>
      </div>

      <div class="card-list">
        @for (entry of chain?.entries; track entry.id) {
          <app-evidence-card [entry]="entry"></app-evidence-card>
        } @empty {
          <div class="empty-state">
            <span class="dim">No forensic evidence loaded.</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .evidence-stream-host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .stream-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid hsl(var(--border-muted));
    }

    .stream-header .count {
      font-size: 0.75rem;
      font-weight: 700;
      color: hsl(var(--text-dim));
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filter-bar {
      display: flex;
      gap: 0.5rem;
    }

    .filter-pill {
      font-size: 0.625rem;
      font-weight: 700;
      padding: 0.125rem 0.5rem;
      background: hsl(var(--bg-elevated));
      border: 1px solid hsl(var(--border-muted));
      border-radius: 2px;
      color: hsl(var(--text-dim));
      cursor: pointer;
    }

    .filter-pill.active {
      color: hsl(var(--text-main));
      border-color: hsl(var(--border-strong));
    }

    .card-list {
      display: flex;
      flex-direction: column;
    }

    .empty-state {
      padding: 4rem;
      text-align: center;
      border: 1px dashed hsl(var(--border-muted));
      border-radius: 4px;
    }
  `]
})
export class EvidenceStreamComponent {
  @Input() chain: EvidenceChain | null = null;
}
