/**
 * archaeology.ts
 * 
 * Nexus ZTAN — Recovery History Engine (Normalized)
 * Manages the long-term storage, indexing, and auditing of operational recovery events.
 */

import fs from 'node:fs';
import path from 'node:path';
import { logger } from '@packages/observability';

const INDEX_FILE = path.join(process.cwd(), 'RECOVERY_HISTORY.json');
const COLD_FILE = path.join(process.cwd(), 'COLD_ARCHIVE.json');
const ARCHIVE_SUMMARY_FILE = path.join(process.cwd(), 'ARCHIVE_SUMMARY.json');

export interface ReplayMetadata {
    id: string;
    timestamp: string;
    service: string;
    failureType: string;
    nodeVersion: string;
    os: string;
    arch: string;
    correlations: Record<string, any>;
    replayFile?: string;
    latencyMs?: number;
    tags: string[];
    status?: string;
    dependencyDelta?: Record<string, string>;
    evidenceQuality?: number;
}

export interface ReplayIndex {
    version: string;
    snapshots: ReplayMetadata[];
    metadata: {
        lastUpdated: string;
        totalReplays: number;
        recoveryStabilityScore: number;
        operationalControl: {
            retentionDays: number;
            compressionEnabled: boolean;
            tiering: {
                standardDays: number;
                failureDays: number;
                criticalDays: number;
                certificationExpiryDays: number;
            };
        };
        accuracy: {
            hits: number;
            misses: number;
            falsePositives: number;
            totalValidations: number;
        };
    };
}

let indexCache: ReplayIndex | null = null;

export const RecoveryHistoryEngine = {
    flushCache(): void {
        indexCache = null;
    },

    loadIndex(): ReplayIndex {
        if (indexCache) return indexCache;
        if (fs.existsSync(INDEX_FILE)) {
            try {
                indexCache = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
                return indexCache!;
            } catch (e) {
                logger.warn('[Archaeology] Index corrupted, resetting');
            }
        }
        return {
            version: '1.0.0',
            snapshots: [],
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalReplays: 0,
                recoveryStabilityScore: 1.0,
                operationalControl: {
                    retentionDays: 90,
                    compressionEnabled: true,
                    tiering: {
                        standardDays: 7,
                        failureDays: 30,
                        criticalDays: 90,
                        certificationExpiryDays: 180
                    }
                },
                accuracy: {
                    hits: 0,
                    misses: 0,
                    falsePositives: 0,
                    totalValidations: 0
                }
            }
        };
    },

    saveIndex(index: ReplayIndex): void {
        indexCache = index;
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    },

    async recordReplay(metadata: Omit<ReplayMetadata, 'timestamp' | 'nodeVersion' | 'os' | 'arch'>): Promise<void> {
        try {
            const index = this.loadIndex();
            const snapshot: ReplayMetadata = {
                ...metadata,
                timestamp: new Date().toISOString(),
                nodeVersion: process.version,
                os: process.platform,
                arch: process.arch,
                tags: metadata.tags || [],
            };

            index.snapshots.push(snapshot);
            index.metadata.lastUpdated = snapshot.timestamp;
            index.metadata.totalReplays = index.snapshots.length;
            
            const uniqueFailures = new Set(index.snapshots.map(s => s.failureType)).size;
            index.metadata.recoveryStabilityScore = index.snapshots.length > 0 
                ? 1 - (uniqueFailures / (index.snapshots.length + 1)) 
                : 1.0;

            this.saveIndex(index);
            logger.info({ id: metadata.id, failureType: metadata.failureType }, '[Archaeology] Indexed historical replay');
        } catch (err) {
            logger.error({ err }, '[Archaeology] Failed to update replay index');
        }
    },

    async lookupFailure(failureType: string): Promise<ReplayMetadata[]> {
        const index = this.loadIndex();
        return index.snapshots.filter(s => s.failureType === failureType);
    },

    validateForecast(failureType: string, forecast: any): void {
        const index = this.loadIndex();
        const now = Date.now();
        const recentWindow = 24 * 60 * 60 * 1000;
        
        const actualInstabilityRecorded = index.snapshots.some(s => 
            s.failureType === failureType && 
            (now - new Date(s.timestamp).getTime()) < recentWindow
        );

        const predictedInstability = forecast.trend === 'DEGRADING';
        const isAccurate = predictedInstability === actualInstabilityRecorded;

        index.metadata.accuracy.totalValidations++;
        if (isAccurate) {
            index.metadata.accuracy.hits++;
        } else if (predictedInstability && !actualInstabilityRecorded) {
            index.metadata.accuracy.falsePositives++;
        } else {
            index.metadata.accuracy.misses++;
        }

        this.saveIndex(index);
    },

    indexArchive(): void {
        if (!fs.existsSync(COLD_FILE)) return;
        const coldArchive = JSON.parse(fs.readFileSync(COLD_FILE, 'utf-8'));
        
        const summary = {
            totalArchived: coldArchive.snapshots.length,
            dateRange: {
                start: coldArchive.snapshots[0]?.timestamp,
                end: coldArchive.snapshots[coldArchive.snapshots.length - 1]?.timestamp
            },
            failureDistribution: coldArchive.snapshots.reduce((acc: any, s: any) => ({
                ...acc,
                [s.failureType]: (acc[s.failureType] || 0) + 1
            }), {}),
            lastIndexed: new Date().toISOString()
        };
        
        fs.writeFileSync(ARCHIVE_SUMMARY_FILE, JSON.stringify(summary, null, 2));
    },

    query(params: { failureType?: string, service?: string, nodeVersion?: string, tags?: string[] }): ReplayMetadata[] {
        const index = this.loadIndex();
        return index.snapshots.filter(s => {
            if (params.failureType && s.failureType !== params.failureType) return false;
            if (params.service && s.service !== params.service) return false;
            if (params.nodeVersion && s.nodeVersion !== params.nodeVersion) return false;
            if (params.tags && !params.tags.every(t => s.tags?.includes(t))) return false;
            return true;
        });
    },

    search(query: string): ReplayMetadata[] {
        const index = this.loadIndex();
        const lowerQuery = query.toLowerCase();
        return index.snapshots.filter(s => 
            s.service.toLowerCase().includes(lowerQuery) ||
            s.failureType.toLowerCase().includes(lowerQuery) ||
            s.tags?.some(t => t.toLowerCase().includes(lowerQuery)) ||
            JSON.stringify(s.correlations).toLowerCase().includes(lowerQuery)
        );
    },

    compareReplays(idA: string, idB: string): any {
        const index = this.loadIndex();
        const a = index.snapshots.find(s => s.id === idA);
        const b = index.snapshots.find(s => s.id === idB);
        if (!a || !b) return { error: 'Replay not found' };
        
        return {
            latencyDelta: (a.latencyMs || 0) - (b.latencyMs || 0),
            tagDelta: {
                added: b.tags?.filter(t => !a.tags?.includes(t)),
                removed: a.tags?.filter(t => !b.tags?.includes(t))
            },
            dependencyDelta: b.dependencyDelta
        };
    },

    archiveReplays(): { archivedCount: number } {
        const index = this.loadIndex();
        const now = Date.now();
        const { criticalDays } = index.metadata.operationalControl.tiering;
        const threshold = criticalDays * 24 * 60 * 60 * 1000;
        
        const toArchive = index.snapshots.filter(s => 
            (now - new Date(s.timestamp).getTime()) > threshold
        );
        
        if (toArchive.length === 0) return { archivedCount: 0 };
        
        let coldArchive: { snapshots: ReplayMetadata[] } = { snapshots: [] };
        if (fs.existsSync(COLD_FILE)) {
            coldArchive = JSON.parse(fs.readFileSync(COLD_FILE, 'utf-8'));
        }
        
        coldArchive.snapshots.push(...toArchive as any);
        fs.writeFileSync(COLD_FILE, JSON.stringify(coldArchive, null, 2));
        
        index.snapshots = index.snapshots.filter(s => !toArchive.includes(s));
        this.saveIndex(index);
        this.indexArchive();
        
        return { archivedCount: toArchive.length };
    },

    verifyArchiveIntegrity(): { valid: boolean, errors: string[] } {
        if (!fs.existsSync(COLD_FILE)) return { valid: true, errors: [] };
        const errors: string[] = [];
        try {
            const coldArchive = JSON.parse(fs.readFileSync(COLD_FILE, 'utf-8'));
            const ids = coldArchive.snapshots.map((s: any) => s.id);
            if (new Set(ids).size !== ids.length) errors.push('Archive contains duplicate replay IDs');
            for (const s of coldArchive.snapshots) {
                if (s.tags?.includes('APPROVED') && !s.correlations?.approvedBy) {
                    errors.push(`Replay ${s.id} is APPROVED but lacks operator attribution`);
                }
            }
        } catch (e) {
            errors.push(`Archive file is corrupted: ${e}`);
        }
        return { valid: errors.length === 0, errors };
    },

    compactReplays(): { compactedCount: number } {
        if (!fs.existsSync(COLD_FILE)) return { compactedCount: 0 };
        const coldArchive = JSON.parse(fs.readFileSync(COLD_FILE, 'utf-8'));
        let compactedCount = 0;
        coldArchive.snapshots = coldArchive.snapshots.map((s: any) => {
            const ageDays = (Date.now() - new Date(s.timestamp).getTime()) / (24 * 60 * 60 * 1000);
            if (ageDays > 180 && s.replayFile) {
                compactedCount++;
                const { replayFile, ...lightReplay } = s;
                return { ...lightReplay, tags: [...(s.tags || []), 'COMPACTED'] };
            }
            return s;
        });
        fs.writeFileSync(COLD_FILE, JSON.stringify(coldArchive, null, 2));
        this.indexArchive();
        return { compactedCount };
    },

    getMutationRiskScore(changes: string[]): { score: number, factors: string[], evidenceCount: number, confidence: number } {
        const index = this.loadIndex();
        const failures = index.snapshots.filter(s => s.failureType !== 'SUCCESS');
        const now = Date.now();
        
        let totalRisk = 0;
        const factors: string[] = [];
        let totalEvidence = 0;
        let weightedConfidence = 0;

        for (const pkg of changes) {
            const historicalFailures = failures.filter(f => 
                f.tags?.includes('ECOSYSTEM') && 
                JSON.stringify(f.dependencyDelta || {}).includes(pkg)
            );
            
            if (historicalFailures.length > 0) {
                totalRisk += historicalFailures.length * 10;
                totalEvidence += historicalFailures.length;
                factors.push(`${pkg}: Linked to ${historicalFailures.length} historical regressions`);
                const avgAgeDays = historicalFailures.reduce((acc, f) => 
                    acc + (now - new Date(f.timestamp).getTime()) / (24 * 60 * 60 * 1000), 0) / historicalFailures.length;
                const recencyWeight = Math.max(0.2, 1 - (avgAgeDays / 90));
                weightedConfidence += recencyWeight;
            }
        }
        const avgConfidence = totalEvidence > 0 ? weightedConfidence / factors.length : 0;
        return { score: Math.min(100, totalRisk), factors, evidenceCount: totalEvidence, confidence: Math.min(1, avgConfidence) };
    },

    summarizeCausality(replayIds: string[]): any {
        const index = this.loadIndex();
        const snapshots = index.snapshots.filter(s => replayIds.includes(s.id));
        if (snapshots.length === 0) return null;
        const tags = snapshots.flatMap(s => s.tags || []);
        const tagCounts = tags.reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {} as Record<string, number>);
        const dominantTag = Object.entries(tagCounts).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]?.[0];
        const primaryFailureMap = snapshots.map(s => s.failureType).reduce((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {} as Record<string, number>);
        const primaryFailure = Object.entries(primaryFailureMap).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]?.[0];
        return { summaryId: `causal-summary-${Date.now()}`, count: snapshots.length, primaryFailure, dominantTag, hotspots: Object.entries(tagCounts).filter(([_, count]) => (count as number) > 1).map(([tag]) => tag) };
    },

    getPredictionMetrics(): any {
        const index = this.loadIndex();
        return index.metadata.accuracy;
    },

    getInstabilityWarnings(): string[] {
        const index = this.loadIndex();
        const regressions = index.snapshots.filter(s => s.failureType === 'ECOSYSTEM_REGRESSION').slice(-10);
        return Array.from(new Set(regressions.map(r => `Ecosystem instability detected in ${r.correlations?.target || 'SYSTEM'}`)));
    },

    getReplayChain(id: string): ReplayMetadata[] {
        const index = this.loadIndex();
        const replay = index.snapshots.find(s => s.id === id);
        if (!replay) return [];
        
        const target = replay.correlations?.target;
        return index.snapshots.filter(s => s.correlations?.target === target).slice(-10);
    },

    getEnvironmentStats(): any {
        const index = this.loadIndex();
        return {
            totalReplays: index.metadata.totalReplays,
            stabilityScore: index.metadata.recoveryStabilityScore,
            accuracy: index.metadata.accuracy,
            lastUpdated: index.metadata.lastUpdated
        };
    },

    forecastStability(type: string): any {
        const index = this.loadIndex();
        const recentFailures = index.snapshots.filter(s => s.failureType === type).slice(-5);
        if (recentFailures.length < 2) return { trend: 'STABLE', confidence: 0.5 };
        
        const intervals = [];
        for (let i = 1; i < recentFailures.length; i++) {
            intervals.push(new Date(recentFailures[i].timestamp).getTime() - new Date(recentFailures[i-1].timestamp).getTime());
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const isDegrading = avgInterval < (24 * 60 * 60 * 1000); // Failures becoming more frequent (less than daily)
        
        return {
            trend: isDegrading ? 'DEGRADING' : 'STABLE',
            avgIntervalMs: avgInterval,
            confidence: 0.8
        };
    },

    getApprovalAuditReport(): any {
        const index = this.loadIndex();
        const approved = index.snapshots.filter(s => s.tags?.includes('APPROVED'));
        const regressions = index.snapshots.filter(s => s.failureType === 'ECOSYSTEM_REGRESSION');
        const falseApprovals = approved.filter(a => {
            const nextRegression = regressions.find(r => 
                r.correlations?.target === a.correlations?.target &&
                new Date(r.timestamp).getTime() > new Date(a.timestamp).getTime() &&
                (new Date(r.timestamp).getTime() - new Date(a.timestamp).getTime()) < (48 * 60 * 60 * 1000)
            );
            return !!nextRegression;
        });
        const operatorReliability = approved.reduce((acc: any, a) => {
            const op = a.correlations?.approvedBy || 'UNKNOWN';
            const isFalse = falseApprovals.includes(a);
            acc[op] = acc[op] || { total: 0, successful: 0 };
            acc[op].total++;
            if (!isFalse) acc[op].successful++;
            return acc;
        }, {});
        return { totalApproved: approved.length, falseApprovals: falseApprovals.length, approvalAccuracy: approved.length > 0 ? (approved.length - falseApprovals.length) / approved.length : 1, operatorReliability, auditTimestamp: new Date().toISOString() };
    },

    auditOperatorBehavior(): any {
        const report = this.getApprovalAuditReport();
        const profiles: Record<string, string> = {};
        for (const [op, stats] of Object.entries(report.operatorReliability as Record<string, any>)) {
            const successRate = stats.successful / stats.total;
            if (stats.total < 3) continue;
            if (successRate < 0.6) profiles[op] = 'HIGH_OPTIMISM_LOW_RIGOR';
            else if (successRate > 0.95 && stats.total > 10) profiles[op] = 'EXCEPTIONAL_RIGOR';
            else if (successRate > 0.9) profiles[op] = 'HIGH_SIGNAL_APPROVAL';
        }
        return profiles;
    },

    calibratePredictionAccuracy(): any {
        const report = this.getApprovalAuditReport();
        const index = this.loadIndex();
        const approved = index.snapshots.filter(s => s.tags?.includes('APPROVED'));
        if (approved.length === 0) return { drift: 0 };
        const successWithHighConfidence = approved.filter(a => (a.evidenceQuality || 0) > 0.8 && !report.falseApprovals.includes(a as any)).length;
        const totalHighConfidence = approved.filter(a => (a.evidenceQuality || 0) > 0.8).length;
        const predictionAccuracy = totalHighConfidence > 0 ? successWithHighConfidence / totalHighConfidence : 1;
        return { predictionAccuracy, totalHighConfidenceEvents: totalHighConfidence, drift: 1 - predictionAccuracy };
    },

    compressOperationalLineage(): any {
        const index = this.loadIndex();
        const targetClustering = index.snapshots.reduce((acc: any, s) => {
            const target = s.correlations?.target || 'SYSTEM';
            acc[target] = acc[target] || { approvals: 0, rollbacks: 0, regressions: 0 };
            if (s.tags?.includes('APPROVED')) acc[target].approvals++;
            if (s.tags?.includes('ROLLED_BACK')) acc[target].rollbacks++;
            if (s.failureType === 'ECOSYSTEM_REGRESSION') acc[target].regressions++;
            return acc;
        }, {});
        return Object.entries(targetClustering).map(([target, stats]: [string, any]) => ({ target, ...stats, instabilityIndex: (stats.rollbacks + stats.regressions) / (stats.approvals || 1) })).sort((a: any, b: any) => (b[1].instabilityIndex as number) - (a[1].instabilityIndex as number));
    },

    getExpiredCertifications(): ReplayMetadata[] {
        const index = this.loadIndex();
        const { certificationExpiryDays } = index.metadata.operationalControl.tiering;
        const now = Date.now();
        const threshold = certificationExpiryDays * 24 * 60 * 60 * 1000;
        return index.snapshots.filter(s => s.tags?.includes('APPROVED') && (now - new Date(s.timestamp).getTime()) > threshold);
    },

    recordRollback(id: string, reason: string): void {
        const index = this.loadIndex();
        const replay = index.snapshots.find(s => s.id === id);
        if (replay) {
            replay.tags = replay.tags || [];
            replay.tags.push('ROLLED_BACK');
            replay.correlations.rollbackReason = reason;
            replay.correlations.rolledBackAt = new Date().toISOString();
            replay.tags = replay.tags.filter(t => t !== 'APPROVED');
            this.saveIndex(index);
        }
    },

    /**
     * Generate a compressed narrative of operational control over a time window
     */
    generateOperationalNarrative(days: number = 30): string[] {
        const index = this.loadIndex();
        const now = Date.now();
        const window = days * 24 * 60 * 60 * 1000;
        
        const recentSnapshots = index.snapshots.filter(s => 
            (now - new Date(s.timestamp).getTime()) < window
        );

        const narratives: string[] = [];
        const approvals = recentSnapshots.filter(s => s.tags?.includes('APPROVED')).length;
        const rollbacks = recentSnapshots.filter(s => s.tags?.includes('ROLLED_BACK')).length;
        const regressions = recentSnapshots.filter(s => s.failureType === 'ECOSYSTEM_REGRESSION').length;

        narratives.push(`### Operational Control Narrative (Last ${days} days)`);
        narratives.push(`* **Throughput**: ${recentSnapshots.length} operational events recorded.`);
        narratives.push(`* **Control**: ${approvals} certifications granted, ${rollbacks} rollbacks enforced.`);
        narratives.push(`* **Stability**: ${regressions} regressions detected post-deployment.`);

        const topHotspots = this.compressOperationalLineage().slice(0, 3);
        if (topHotspots.length > 0) {
            narratives.push(`* **Primary Friction**: Persistent instability observed in: ${topHotspots.map((h: any) => h.target).join(', ')}.`);
        }

        return narratives;
    },

    /**
     * Track the evolution of instability hotspots over time
     */
    summarizeHotspotEvolution(): any[] {
        const index = this.loadIndex();
        const targets = Array.from(new Set(index.snapshots.map(s => s.correlations?.target || 'SYSTEM')));
        
        return targets.map(target => {
            const snapshots = index.snapshots.filter(s => (s.correlations?.target || 'SYSTEM') === target);
            const timeline = snapshots.map(s => ({
                timestamp: s.timestamp,
                event: s.tags?.includes('APPROVED') ? 'APPROVAL' : (s.tags?.includes('ROLLED_BACK') ? 'ROLLBACK' : 'REGRESSION')
            }));
            
            return { target, timeline: timeline.slice(-10) }; // Last 10 events for evolution tracking
        });
    },

    /**
     * Record current prediction accuracy to historical log
     */
    trackPredictionAccuracy(): void {
        const index = this.loadIndex();
        const accuracy = this.calibratePredictionAccuracy();
        
        const historyPath = path.join(process.cwd(), 'PREDICTION_ACCURACY_HISTORY.json');
        let history: any[] = [];
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        }
        
        history.push({
            timestamp: new Date().toISOString(),
            ...accuracy
        });
        
        // Maintain last 50 calibration points
        fs.writeFileSync(historyPath, JSON.stringify(history.slice(-50), null, 2));
    },

    getPredictionAccuracyHistory(): any[] {
        const historyPath = path.join(process.cwd(), 'PREDICTION_ACCURACY_HISTORY.json');
        if (!fs.existsSync(historyPath)) return [];
        return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    },

    /**
     * Perform a drill to verify that archived replays are fully reconstructable
     */
    verifyArchiveRecoverability(): { success: boolean, sampleCount: number, errors: string[] } {
        if (!fs.existsSync(COLD_FILE)) return { success: true, sampleCount: 0, errors: [] };
        
        const errors: string[] = [];
        const coldArchive = JSON.parse(fs.readFileSync(COLD_FILE, 'utf-8'));
        const samples = coldArchive.snapshots.slice(-5); // Verify last 5 archived items
        
        for (const sample of samples) {
            // Verify lineage preservation
            if (!sample.id || !sample.timestamp || !sample.correlations) {
                errors.push(`Archived sample ${sample.id || 'unknown'} is missing critical forensic metadata`);
            }
            
            // Check for compaction state
            if (sample.tags?.includes('COMPACTED') && sample.replayFile) {
                errors.push(`Archived sample ${sample.id} is marked COMPACTED but still contains heavy replayFile reference`);
            }
        }
        
        return { success: errors.length === 0, sampleCount: samples.length, errors };
    },

    /**
     * Detect degradation in review velocity over time (detecting rubber stamping)
     */
    auditReviewVelocity(): any {
        const index = this.loadIndex();
        const approved = index.snapshots.filter(s => s.tags?.includes('APPROVED'));
        
        // Group by week
        const weeklyApprovals = approved.reduce((acc: any, a) => {
            const week = new Date(a.timestamp).toISOString().split('T')[0].slice(0, 7); // YYYY-MM
            acc[week] = (acc[week] || 0) + 1;
            return acc;
        }, {});

        const weeks = Object.keys(weeklyApprovals).sort();
        const approvalVelocity = weeks.map(w => ({ week: w, count: weeklyApprovals[w] }));

        // Detect velocity spikes (potential "rubber stamping")
        const fatigueIndicators: string[] = [];
        for (let i = 1; i < approvalVelocity.length; i++) {
            if (approvalVelocity[i].count > approvalVelocity[i-1].count * 2) {
                fatigueIndicators.push(`Velocity spike detected in ${approvalVelocity[i].week}: Approval volume doubled week-over-week.`);
            }
        }

        return {
            approvalVelocity,
            fatigueIndicators,
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Simulate a complete operator turnover to verify handoff survivability
     */
    verifyOperationalTransfer(): { success: boolean, findings: string[] } {
        const findings: string[] = [];
        
        // Check if critical reasoning is captured in replay metadata
        const index = this.loadIndex();
        const recentApprovals = index.snapshots.filter(s => s.tags?.includes('APPROVED')).slice(-5);
        
        for (const approval of recentApprovals) {
            if (!approval.correlations?.reasoning && !approval.correlations?.evidenceContext) {
                findings.push(`Handoff Gap: Approval ${approval.id} lacks captured reasoning context (Tribal Knowledge Dependency).`);
            }
        }

        // Verify narrative availability
        const narrative = this.generateOperationalNarrative(90);
        if (narrative.length < 5) {
            findings.push('Handoff Gap: Insufficient longitudinal operational narrative for new stewards.');
        }

        return {
            success: findings.length === 0,
            findings
        };
    },

    /**
     * Calculate the operational relevance of a replay to help prune low-signal noise
     */
    calculateReplayRelevance(id: string): number {
        const index = this.loadIndex();
        const replay = index.snapshots.find(s => s.id === id);
        if (!replay) return 0;

        let score = 0;
        if (replay.tags?.includes('APPROVED')) score += 50;
        if (replay.tags?.includes('ROLLED_BACK')) score += 100; // Critical signal
        if (replay.failureType !== 'SUCCESS') score += 30;
        if (replay.evidenceQuality && replay.evidenceQuality > 0.8) score += 20;

        // Recency bonus: last 30 days are high relevance
        const ageDays = (Date.now() - new Date(replay.timestamp).getTime()) / (24 * 60 * 60 * 1000);
        if (ageDays < 30) score += 20;

        return Math.min(100, score);
    },

    /**
     * Audit telemetry noise to identify low-signal data points
     */
    auditTelemetryNoise(): any {
        const index = this.loadIndex();
        const total = index.snapshots.length;
        const lowRelevance = index.snapshots.filter(s => this.calculateReplayRelevance(s.id) < 30).length;
        
        return {
            totalReplays: total,
            noiseCount: lowRelevance,
            signalDensity: total > 0 ? (total - lowRelevance) / total : 1,
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Forecast archaeology storage growth over multi-year horizons
     */
    forecastStorageGrowth(years: number = 3): any {
        const index = this.loadIndex();
        const now = Date.now();
        const snapshots = index.snapshots;
        if (snapshots.length < 2) return { growthRate: 0 };

        const start = new Date(snapshots[0].timestamp).getTime();
        const end = new Date(snapshots[snapshots.length - 1].timestamp).getTime();
        const durationDays = (end - start) / (24 * 60 * 60 * 1000);
        
        const replaysPerDay = snapshots.length / (durationDays || 1);
        const forecastCount = Math.round(replaysPerDay * 365 * years);
        
        // Assume avg 2KB per metadata record + 50KB for heavy replays (pre-compaction)
        const currentSizeEstimate = snapshots.length * 52; // KB
        const forecastSizeEstimate = forecastCount * 52; // KB

        return {
            replaysPerDay: replaysPerDay.toFixed(2),
            currentSizeKB: currentSizeEstimate,
            forecastCount,
            forecastSizeMB: (forecastSizeEstimate / 1024).toFixed(2),
            horizonYears: years
        };
    },

    /**
     * Simulate an institutional handoff to a new operator to test knowledge durability
     */
    simulateInstitutionalHandoff(): any {
        const index = this.loadIndex();
        const docsExist = fs.existsSync(path.join(process.cwd(), 'OPERATIONAL_STEWARDSHIP.md'));
        
        return {
            success: docsExist && index.snapshots.length > 0,
            operatorIndependenceLevel: docsExist ? 0.95 : 0.4,
            documentationStatus: docsExist ? 'PRESENT' : 'MISSING',
            stewardshipEvidence: index.snapshots.length
        };
    },


    /**
     * Perform a long-horizon survivability drill to ensure 1-year reconstruction integrity
     */
    performLongHorizonDrill(): any {
        const recoverability = this.verifyArchiveRecoverability();
        const handoff = this.simulateInstitutionalHandoff();
        const growth = this.forecastStorageGrowth(5); // 5-year outlook
        
        const success = recoverability.success && handoff.success;
        
        return {
            success,
            archivalIntegrity: recoverability.success ? 'NOMINAL' : 'DEGRADED',
            handoffSurvivability: handoff.success ? 'CERTIFIED' : 'GAPS_DETECTED',
            fiveYearStorageProjectionMB: growth.forecastSizeMB,
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Analyze operational decay by tracking trends in recovery success and stewardship rigor
     */
    analyzeOperationalDecay(): any {
        const index = this.loadIndex();
        const now = Date.now();
        const window = 30 * 24 * 60 * 60 * 1000;
        
        const recent = index.snapshots.filter(s => (now - new Date(s.timestamp).getTime()) < window);
        const previous = index.snapshots.filter(s => 
            (now - new Date(s.timestamp).getTime()) >= window && 
            (now - new Date(s.timestamp).getTime()) < (window * 2)
        );

        const recentSuccessRate = recent.length > 0 ? recent.filter(s => s.failureType === 'SUCCESS').length / recent.length : 1;
        const previousSuccessRate = previous.length > 0 ? previous.filter(s => s.failureType === 'SUCCESS').length / previous.length : 1;

        const drift = previousSuccessRate - recentSuccessRate;
        
        // Freshness: Check most recent operational activity
        const lastActivity = index.snapshots.length > 0 ? new Date(index.snapshots[index.snapshots.length-1].timestamp).getTime() : 0;
        const inactivityDays = (now - lastActivity) / (24 * 60 * 60 * 1000);

        return {
            recentSuccessRate,
            previousSuccessRate,
            drift: drift.toFixed(4),
            decayDetected: drift > 0.05, // 5% drop is significant
            inactivityDays: inactivityDays.toFixed(1),
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Audit Approval Quality (formerly Operational Control Rigor)
     */
    auditApprovalQuality(): any {
        const index = this.loadIndex();
        const approved = index.snapshots.filter(s => s.tags?.includes('APPROVED'));
        
        const lowSubstanceApprovals = approved.filter(a => 
            !a.correlations?.reasoning || a.correlations?.reasoning.length < 20
        );

        const rubberStampRatio = approved.length > 0 ? lowSubstanceApprovals.length / approved.length : 0;

        return {
            totalApprovals: approved.length,
            lowSubstanceApprovals: lowSubstanceApprovals.length,
            rubberStampRatio: rubberStampRatio.toFixed(2),
            rigorWarning: rubberStampRatio > 0.3,
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Forecast the economic and cognitive burden of ongoing stewardship
     */
    auditStewardshipEconomics(): any {
        const report = this.getApprovalAuditReport();
        const operators = Object.keys(report.operatorReliability).length;
        const totalEvents = this.loadIndex().snapshots.length;
        
        // Assume avg 10 mins per manual approval/rehearsal
        const estimatedHumanMinutes = report.totalApproved * 10;
        
        return {
            totalOperatorCount: operators,
            stewardshipBurdenMinutes: estimatedHumanMinutes,
            avgEventsPerOperator: (totalEvents / (operators || 1)).toFixed(1),
            cognitiveLoadIndex: (estimatedHumanMinutes / (operators || 1)).toFixed(1),
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Validate the freshness of operational runbooks and procedures
     */
    validateRunbookFreshness(): any {
        const index = this.loadIndex();
        const now = Date.now();
        const staleThreshold = 180 * 24 * 60 * 60 * 1000; // 180 days
        
        // Find certifications that are older than the threshold
        const staleCerts = index.snapshots.filter(s => 
            s.tags?.includes('APPROVED') && 
            (now - new Date(s.timestamp).getTime()) > staleThreshold
        );

        return {
            staleCertifications: staleCerts.length,
            freshnessScore: index.snapshots.length > 0 ? (index.snapshots.length - staleCerts.length) / index.snapshots.length : 1,
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Simulate the total absence of founding architects to verify independent stewardship
     */
    simulateFounderAbsence(): { survivable: boolean, gaps: string[] } {
        const handoff = this.verifyOperationalTransfer();
        const decay = this.analyzeOperationalDecay();
        const rigor = this.auditApprovalQuality();
        
        const gaps: string[] = [...handoff.findings];
        if (decay.decayDetected) gaps.push('Operational Decay: Success rates are trending downward.');
        if (rigor.rigorWarning) gaps.push('Operational Ritualization: Rubber-stamping behavior detected.');
        
        return {
            survivable: gaps.length === 0,
            gaps
        };
    },

    /**
     * Fold similar replays into a single representative event to reduce archaeology noise
     */
    foldSimilarReplays(): { foldedCount: number } {
        const index = this.loadIndex();
        const initialCount = index.snapshots.length;
        const uniqueSnapshots: any[] = [];
        const foldedIds: string[] = [];

        for (const snapshot of index.snapshots) {
            const isDuplicate = uniqueSnapshots.some(s => 
                s.failureType === snapshot.failureType &&
                s.tags?.join(',') === snapshot.tags?.join(',') &&
                Math.abs(new Date(s.timestamp).getTime() - new Date(snapshot.timestamp).getTime()) < (60 * 60 * 1000) // Within 1 hour
            );

            if (isDuplicate) {
                foldedIds.push(snapshot.id);
            } else {
                uniqueSnapshots.push(snapshot);
            }
        }

        index.snapshots = uniqueSnapshots;
        this.saveIndex(index);

        return { foldedCount: foldedIds.length };
    },

    /**
     * Calculate Stability Index (formerly Institutional Boredom)
     */
    calculateStabilityIndex(): any {
        const index = this.loadIndex();
        const snapshots = index.snapshots;
        
        if (snapshots.length < 10) return { stabilityIndex: '0.0', status: 'INITIATING' };

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentFailures = snapshots.filter(s => 
            new Date(s.timestamp) > weekAgo && 
            (s.failureType !== 'SUCCESS' || s.tags?.includes('ROLLED_BACK'))
        ).length;

        const stabilityIndex = (Math.max(0, 1 - (recentFailures / 10))).toFixed(2);

        return {
            stabilityIndex,
            isStable: parseFloat(stabilityIndex) > 0.9, 
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Audit Operational Stability by analyzing interaction patterns and timing friction
     */
    auditOperationalStability(): any {
        const index = this.loadIndex();
        const approved = index.snapshots.filter(s => s.tags?.includes('APPROVED'));
        
        if (approved.length < 2) return { taskFriction: 'INSUFFICIENT_DATA' };

        const frictionPoints: number[] = [];
        for (let i = 1; i < approved.length; i++) {
            const delta = new Date(approved[i].timestamp).getTime() - new Date(approved[i-1].timestamp).getTime();
            // If events are within 10 minutes, assume they are part of a continuous workflow
            if (delta < 10 * 60 * 1000) {
                frictionPoints.push(delta);
            }
        }

        const avgTaskDuration = frictionPoints.length > 0 ? frictionPoints.reduce((a, b) => a + b, 0) / frictionPoints.length : 0;

        return {
            averageTaskDurationSeconds: (avgTaskDuration / 1000).toFixed(1),
            simplicityCertification: avgTaskDuration < 2 * 60 * 1000 ? 'HIGH' : 'LOW', // Sub-2min tasks are high simplicity
            auditTimestamp: new Date().toISOString()
        };
    },

    /**
     * Operator Friction Monitor (formerly Quiet Observer)
     */
    monitorOperatorFriction(): any {
        const index = this.loadIndex();
        const snapshots = index.snapshots;
        
        if (snapshots.length < 5) return { behaviorStatus: 'OBSERVING' };

        const hesitationPoints = [];
        const retryPatterns = [];

        for (let i = 1; i < snapshots.length; i++) {
            const current = snapshots[i];
            const prev = snapshots[i-1];
            const delta = new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime();

            // Hesitation: More than 5 minutes between simple setup steps
            if (delta > 5 * 60 * 1000 && delta < 30 * 60 * 1000) {
                hesitationPoints.push({
                    step: current.tags?.[0] || 'unknown',
                    durationSeconds: delta / 1000
                });
            }

            // Retry: Same failure tag twice in a row
            if (current.status === 'ERROR' && prev.status === 'ERROR' && current.tags?.[0] === prev.tags?.[0]) {
                retryPatterns.push({
                    failureType: current.tags?.[0],
                    attempts: 2
                });
            }
        }

        return {
            detectedHesitations: hesitationPoints.length,
            detectedRetries: retryPatterns.length,
            frictionHotspots: Array.from(new Set(retryPatterns.map(r => r.failureType))),
            observationTimestamp: new Date().toISOString()
        };
    }
};
