import fs from 'fs';
import path from 'path';

/**
 * ─── ZTAN Soak Telemetry Report Generator ────────────────────────────────────
 * Compiles performance, GC, latency, and parity logs recorded during continuous
 * soak runs, exporting an auditable JSON summary to the local state storage.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface SoakReportData {
    durationMs: number;
    memoryStats: any;
    dbLatencyStats: any;
    parityHistory: any[];
    errors: string[];
    quarantineCount: number;
    chronologyAudit?: any;
}

export function generateSoakReport(workspaceRoot: string, data: SoakReportData): string {
    const reportDir = path.resolve(workspaceRoot, '.ztan');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'soak-report.json');
    const content = JSON.stringify({
        generatedAt: new Date().toISOString(),
        ...data
    }, null, 2);
    
    fs.writeFileSync(reportPath, content, 'utf8');
    console.log(`[Soak Reporter] Exported operational telemetry summary to: ${reportPath}`);
    return reportPath;
}
