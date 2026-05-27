import fs from 'fs';
import path from 'path';
import { IncidentBundle } from './failure-bundle-generator.js';

export interface ReplayAuditResult {
    incidentId: string;
    verdict: string;
    primaryTrigger: string;
    totalEvents: number;
    unledgeredEnvKeys: string[];
    ledgerChainHealthy: boolean;
    brokenLinksCount: number;
}

export class IncidentReplayer {
    /**
     * Loads and parses an incident bundle from the local file system.
     */
    public static loadBundle(filePath: string): IncidentBundle {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Incident bundle file not found: ${absolutePath}`);
        }
        const raw = fs.readFileSync(absolutePath, 'utf8');
        return JSON.parse(raw) as IncidentBundle;
    }

    /**
     * Performs a complete forensic audit of the loaded incident envelope.
     */
    public static auditBundle(bundle: IncidentBundle): ReplayAuditResult {
        // Detect environment keys that were flagged as unledgered
        const unledgeredEnvKeys: string[] = [];
        if (bundle.environment && bundle.environment.allKeysHashed) {
            // Find keys that are not part of standard ZTAN ledgered environment variables
            const coreZtanVars = new Set([
                'NODE_ENV',
                'DATABASE_URL',
                'PORT',
                'REDIS_URL',
                'ETCD_ENDPOINTS',
                'JWT_SECRET',
                'LOG_LEVEL'
            ]);
            for (const key of Object.keys(bundle.environment.allKeysHashed)) {
                if (!coreZtanVars.has(key)) {
                    unledgeredEnvKeys.push(key);
                }
            }
        }

        // Verify the chronological hash chain of the captured ledger blocks
        let ledgerChainHealthy = true;
        let brokenLinksCount = 0;
        if (bundle.sequences && Array.isArray(bundle.sequences.ledgerBlocks)) {
            const blocks = [...bundle.sequences.ledgerBlocks].sort((a, b) => a.id - b.id);
            for (let i = 1; i < blocks.length; i++) {
                if (blocks[i].prevHash !== blocks[i - 1].hash) {
                    ledgerChainHealthy = false;
                    brokenLinksCount++;
                }
            }
        }

        return {
            incidentId: bundle.incidentId,
            verdict: bundle.verdict?.verdict || 'UNKNOWN_SAFETY_INVARIANT_VIOLATION',
            primaryTrigger: bundle.verdict?.primaryTrigger || 'SYSTEM_EXCEPTION',
            totalEvents: bundle.timeline?.length || 0,
            unledgeredEnvKeys,
            ledgerChainHealthy,
            brokenLinksCount
        };
    }

    /**
     * Prints a beautiful, formatted chronological trace to the terminal.
     */
    public static printTrace(bundle: IncidentBundle): void {
        console.log(`================================================================================`);
        console.log(`🕵️‍♂️  ZTAN FORENSIC INCIDENT ARCHAEOLOGY REPORT: ${bundle.incidentId}`);
        console.log(`================================================================================`);
        console.log(`Incident ID:   ${bundle.incidentId}`);
        console.log(`Captured At:   ${bundle.timestamp}`);
        console.log(`Verdict:       ${bundle.verdict?.verdict || 'UNKNOWN'}`);
        console.log(`Trigger:       ${bundle.verdict?.primaryTrigger || 'UNKNOWN'}`);
        console.log(`Confidence:    ${bundle.verdict?.confidence ? (bundle.verdict.confidence * 100) + '%' : 'N/A'}`);
        console.log(`--------------------------------------------------------------------------------`);
        console.log(`🕒 CHRONOLOGICAL FAILURE TIMELINE RECONSTRUCTION:`);
        console.log(`--------------------------------------------------------------------------------`);

        if (bundle.timeline && Array.isArray(bundle.timeline)) {
            const sortedEvents = [...bundle.timeline].sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            for (const event of sortedEvents) {
                const statusIcon = event.status === 'FATAL' ? '🚨' : event.status === 'ALERT' ? '⚠️' : 'ℹ️';
                console.log(`[${event.timestamp}] [${event.stage}] ${statusIcon} ${event.status}: ${event.description}`);
            }
        } else {
            console.log('No timeline events found in this bundle.');
        }

        console.log(`--------------------------------------------------------------------------------`);
        console.log(`📊 CAPTURED LEDGER SEQUENCE SUMMARY:`);
        console.log(`--------------------------------------------------------------------------------`);
        const blockCount = bundle.sequences?.ledgerBlocks?.length || 0;
        const walCount = bundle.sequences?.walLogs?.length || 0;
        console.log(`- Total Captured Ledger Blocks: ${blockCount}`);
        console.log(`- Total Captured WAL Records:   ${walCount}`);

        const audit = this.auditBundle(bundle);
        console.log(`- Ledger Parity Audit:          ${audit.ledgerChainHealthy ? '💚 PRISTINE' : '🔴 BROKEN CHAIN'}`);
        if (!audit.ledgerChainHealthy) {
            console.log(`  └─ Total broken links:        ${audit.brokenLinksCount}`);
        }
        console.log(`- Unledgered Env Override Keys: ${audit.unledgeredEnvKeys.length} keys`);
        if (audit.unledgeredEnvKeys.length > 0) {
            console.log(`  └─ Keys:                      ${audit.unledgeredEnvKeys.join(', ')}`);
        }
        console.log(`================================================================================\n`);
    }
}
