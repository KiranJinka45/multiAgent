import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CausalNode {
  id: string;
  type: string;
  status: 'HEALTHY' | 'ANOMALY' | 'ROOT_CAUSE';
  anomalyScore: number;
}

@Component({
  selector: 'sre-causal-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="causal-container">
      <div class="graph-nodes">
        <div *ngFor="let node of nodes()" 
             class="node-box" 
             [class]="node.status.toLowerCase()"
             [style.left.px]="getPosition(node.id).x"
             [style.top.px]="getPosition(node.id).y">
          <div class="node-icon">{{ getIcon(node.type) }}</div>
          <div class="node-label">{{ node.id }}</div>
          <div class="node-score" *ngIf="node.anomalyScore > 0.1">
            {{ node.anomalyScore | number:'1.2-2' }}
          </div>
          <div class="root-indicator" *ngIf="node.status === 'ROOT_CAUSE'">ROOT CAUSE</div>
        </div>
        
        <!-- SVG Connections -->
        <svg class="graph-edges">
          <line *ngFor="let edge of edges()"
                [attr.x1]="getPosition(edge.from).x + 40"
                [attr.y1]="getPosition(edge.from).y + 30"
                [attr.x2]="getPosition(edge.to).x + 40"
                [attr.y2]="getPosition(edge.to).y + 30"
                class="edge-line"
                [class.active]="isPathActive(edge.from, edge.to)" />
        </svg>
      </div>
    </div>
  `,
  styles: [`
    .causal-container {
      position: relative;
      height: 300px;
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      padding: 20px;
      overflow: hidden;
    }
    .graph-nodes { position: relative; width: 100%; height: 100%; }
    .node-box {
      position: absolute;
      width: 80px;
      padding: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2;

      &.anomaly { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
      &.root_cause { border-color: #f59e0b; background: rgba(245, 158, 11, 0.2); box-shadow: 0 0 25px rgba(245, 158, 11, 0.4); transform: scale(1.1); }
    }
    .node-icon { font-size: 20px; margin-bottom: 4px; }
    .node-label { font-size: 8px; font-weight: 800; opacity: 0.6; text-transform: uppercase; text-align: center; }
    .node-score { font-size: 10px; font-weight: 900; color: #ef4444; margin-top: 4px; }
    .root-indicator { 
      position: absolute; top: -12px; font-size: 7px; font-weight: 900; 
      background: #f59e0b; color: #000; padding: 2px 4px; border-radius: 4px;
    }

    .graph-edges { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
    .edge-line { stroke: rgba(255,255,255,0.1); stroke-width: 1; transition: all 0.5s; }
    .edge-line.active { stroke: #ef4444; stroke-width: 2; stroke-dasharray: 4; animation: dash 1s linear infinite; }

    @keyframes dash { to { stroke-dashoffset: -8; } }
  `]
})
export class CausalGraphComponent {
  @Input() rca: { rootCause: string; confidence: number } | null = null;
  @Input() anomalyScore: number = 0;
  @Input() topology: { 
    nodes: { id: string, type: string }[], 
    edges: { from: string, to: string }[] 
  } = { nodes: [], edges: [] };

  public nodes = computed(() => {
    return this.topology.nodes.map(n => ({
      ...n,
      status: this.getStatus(n.id),
      anomalyScore: this.getScore(n.id)
    }));
  });

  public edges = computed(() => this.topology.edges);

  private getStatus(id: string): 'HEALTHY' | 'ANOMALY' | 'ROOT_CAUSE' {
    if (this.rca?.rootCause === id) return 'ROOT_CAUSE';
    // If it's a dependent of the root cause and currently has an anomaly
    if (this.rca && this.isDependentOf(id, this.rca.rootCause) && this.getScore(id) > 0.4) return 'ANOMALY';
    return 'HEALTHY';
  }

  private isDependentOf(nodeId: string, potentialRoot: string): boolean {
    return this.topology.edges.some(e => e.from === nodeId && e.to === potentialRoot);
  }

  private getScore(id: string): number {
    if (id === 'api-service') return this.anomalyScore;
    if (this.rca?.rootCause === id) return 0.95;
    // For demo/simulated propagation
    if (this.rca?.rootCause === 'db-primary' && id === 'api-service') return 0.85;
    return 0;
  }

  public getPosition(id: string) {
    // Simple Grid-based layout for dynamic nodes
    const nodeIndex = this.topology.nodes.findIndex(n => n.id === id);
    if (nodeIndex === -1) return { x: 0, y: 0 };

    const colWidth = 150;
    const rowHeight = 100;
    
    // Group by type for visual hierarchy
    const typeOrder: any = { 'GATEWAY': 0, 'SERVICE': 1, 'DATABASE': 2, 'CACHE': 2 };
    const node = this.topology.nodes[nodeIndex];
    const col = typeOrder[node.type] ?? 1;
    
    // Calculate row based on index within the same type
    const sameTypeNodes = this.topology.nodes.filter(n => n.type === node.type);
    const row = sameTypeNodes.findIndex(n => n.id === id);

    return { 
      x: 50 + (col * colWidth), 
      y: 120 + (row * rowHeight) - ((sameTypeNodes.length - 1) * rowHeight / 2)
    };
  }

  public getIcon(type: string) {
    switch (type) {
      case 'GATEWAY': return '🌐';
      case 'SERVICE': return '⚙️';
      case 'DATABASE': return '🗄️';
      case 'CACHE': return '⚡';
      default: return '📦';
    }
  }

  public isPathActive(from: string, to: string): boolean {
    if (!this.rca) return false;
    // Path is active if it leads to the root cause
    if (this.rca.rootCause === to || (this.rca.rootCause === 'db-primary' && from === 'web-frontend' && to === 'api-service')) return true;
    return false;
  }
}
