/**
 * ZTAN Phase Ω.4 - Visual Fidelity Regression Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Decades-scale layout and rendering drift forensics for static timelines.
 * 2. Purely advisory visual regression. Never blocks archaeology view loading.
 * 3. Monospace standard coordinate hash checks. Zero autonomous recovery loops.
 */

import crypto from 'crypto';

export interface SvgGeometrySnapshot {
    elementId: string;
    tagName: 'circle' | 'line' | 'rect' | 'text';
    coordinates: { x: number; y: number; width?: number; height?: number; radius?: number };
    fontSize?: number;
    colorHex?: string;
}

export interface LayoutMetricDelta {
    elementId: string;
    metricType: 'COORDINATE' | 'SCALE' | 'FONT_SIZE' | 'COLOR';
    driftValue: number;
    description: string;
}

export interface VisualFidelityReport {
    campaignId: string;
    timestamp: number;
    geometryHashMatches: boolean;
    currentGeometryHash: string;
    expectedGeometryHash: string;
    layoutDeltas: LayoutMetricDelta[];
    renderingSurvivable: boolean;
    advisoryWarnings: string[];
}

export class VisualFidelityRegressionCampaign {

    /**
     * Computes a deterministic SHA-256 geometry hash representing the coordinates,
     * tags, and bounds of a visual SVG rendering timeline to lock layout structures.
     */
    public calculateGeometryHash(nodes: SvgGeometrySnapshot[]): string {
        // Sort by element ID to ensure deterministic serialization
        const sorted = [...nodes].sort((a, b) => a.elementId.localeCompare(b.elementId));
        
        let preimage = '';
        for (const node of sorted) {
            const coordsStr = `${node.coordinates.x},${node.coordinates.y},${node.coordinates.width || 0},${node.coordinates.height || 0},${node.coordinates.radius || 0}`;
            preimage += `${node.elementId}${node.tagName}${coordsStr}${node.fontSize || 0}${node.colorHex || ''}`;
        }

        return crypto.createHash('sha256').update(preimage).digest('hex');
    }

    /**
     * Statically audits physical rendering layout differences between reference models
     * and current rendering outcomes, highlighting aspect or text truncation drift.
     */
    public auditLayoutDrift(
        current: SvgGeometrySnapshot[],
        reference: SvgGeometrySnapshot[]
    ): LayoutMetricDelta[] {
        const deltas: LayoutMetricDelta[] = [];
        const refMap = new Map<string, SvgGeometrySnapshot>();
        reference.forEach(x => refMap.set(x.elementId, x));

        for (const cur of current) {
            const ref = refMap.get(cur.elementId);
            if (!ref) continue;

            // 1. Audit Coordinate Drift
            const dist = Math.sqrt(
                Math.pow(cur.coordinates.x - ref.coordinates.x, 2) +
                Math.pow(cur.coordinates.y - ref.coordinates.y, 2)
            );

            if (dist > 5.0) { // drift limit of 5 units
                deltas.push({
                    elementId: cur.elementId,
                    metricType: 'COORDINATE',
                    driftValue: Math.round(dist * 100) / 100,
                    description: `Coordinate drift of ${Math.round(dist * 10)}% units detected. Potential timeline tick overlap risk.`
                });
            }

            // 2. Audit Aspect Scale Drift (for bounds/radius)
            if (cur.coordinates.radius !== undefined && ref.coordinates.radius !== undefined) {
                const radiusDiff = Math.abs(cur.coordinates.radius - ref.coordinates.radius);
                if (radiusDiff > 1.0) {
                    deltas.push({
                        elementId: cur.elementId,
                        metricType: 'SCALE',
                        driftValue: radiusDiff,
                        description: `Tick scale radius changed by ${radiusDiff} units. Timeline ticks display visual distortion.`
                    });
                }
            }

            // 3. Audit Font Metric Drift
            if (cur.fontSize && ref.fontSize && cur.fontSize !== ref.fontSize) {
                deltas.push({
                    elementId: cur.elementId,
                    metricType: 'FONT_SIZE',
                    driftValue: Math.abs(cur.fontSize - ref.fontSize),
                    description: `Font sizing changed from ${ref.fontSize}px to ${cur.fontSize}px. Risk of text label clipping.`
                });
            }
        }

        return deltas;
    }

    /**
     * Runs the Visual Fidelity Regression Campaign.
     * Evaluates static SVG geometries against historical golden baselines.
     */
    public runFidelityCampaign(
        campaignId: string,
        currentLayout: SvgGeometrySnapshot[],
        referenceLayout: SvgGeometrySnapshot[]
    ): VisualFidelityReport {
        const advisoryWarnings: string[] = [];

        // 1. Calculate and compare SHA-256 visual hashes
        const currentGeometryHash = this.calculateGeometryHash(currentLayout);
        const expectedGeometryHash = this.calculateGeometryHash(referenceLayout);
        const geometryHashMatches = currentGeometryHash === expectedGeometryHash;

        if (!geometryHashMatches) {
            advisoryWarnings.push('GEOMETRY HASH MISMATCH: Visual timeline element geometries have changed from historical baseline references.');
        }

        // 2. Audit specific layout drift deltas
        const layoutDeltas = this.auditLayoutDrift(currentLayout, referenceLayout);
        let coordinateRotIssuesCount = 0;

        for (const delta of layoutDeltas) {
            if (delta.metricType === 'COORDINATE' && delta.driftValue > 15.0) {
                coordinateRotIssuesCount++;
            }
            advisoryWarnings.push(`LAYOUT DRIFT DETECTED: [${delta.metricType}] in '${delta.elementId}' details: ${delta.description}`);
        }

        const renderingSurvivable = coordinateRotIssuesCount === 0;
        if (!renderingSurvivable) {
            advisoryWarnings.push('CRITICAL RENDERING ROT: Severe coordinate drift detected. Visual timeline labels or ticks have collided, making replayer uninterpretable.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            geometryHashMatches,
            currentGeometryHash,
            expectedGeometryHash,
            layoutDeltas,
            renderingSurvivable,
            advisoryWarnings
        };
    }
}
