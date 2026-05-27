export interface ThawSession {
    sessionId: string;
    startTime: number;
    expiryTime: number;
    authorizedOperators: string[];
    isActive: boolean;
    domain: string;
    revocationReason?: string;
}

export interface ThawNormalizationReport {
    totalThawsRequested: number;
    thawFrequencySlope: number; // positive = frequency is increasing
    operatorConcentration: number; // HHI concentration index: 0.0 to 1.0
    normalizationRiskIndex: number; // 0.0 to 1.0
    frequentThawDomains: Record<string, number>;
    requiresElevatedConsensus: boolean;
}

export class FreezeEscapeCoordinator {
    private authorizedSreKeys: Set<string>;
    private activeSessions = new Map<string, ThawSession>();
    private auditLogs: Array<{
        timestamp: number;
        action: string;
        details: Record<string, any>;
    }> = [];

    private thawRequestsHistory: Array<{
        timestamp: number;
        operators: string[];
        domain: string;
        success: boolean;
    }> = [];

    // Hardening: Thaw Exhaustion & Scar Tissue
    private elevatedThawsCount = 0;
    private cooldownExpiresAt = 0;
    private cooldownDurationMs = 3600000; // Default to 1 hour
    private scarTissue: Array<{ timestamp: number; warning: string }> = [];

    // Thaw Rehabilitation Gates
    private rehabilitationMilestones = new Map<string, boolean>();

    constructor(authorizedSreKeys: string[]) {
        this.authorizedSreKeys = new Set(authorizedSreKeys);
    }

    /**
     * Set the cooldown duration (primarily for testing purposes)
     */
    public setCooldownDuration(ms: number): void {
        this.cooldownDurationMs = ms;
    }

    /**
     * Completes a specific rehabilitation milestone to lift the cooldown.
     */
    public completeRehabilitationMilestone(milestone: string): void {
        if (this.rehabilitationMilestones.has(milestone)) {
            this.rehabilitationMilestones.set(milestone, true);
            this.logAudit('REHABILITATION_MILESTONE_COMPLETED', { milestone });
        }
    }

    /**
     * Gets outstanding rehabilitation milestones.
     */
    public getOutstandingMilestones(): string[] {
        const outstanding: string[] = [];
        for (const [milestone, completed] of this.rehabilitationMilestones.entries()) {
            if (!completed) {
                outstanding.push(milestone);
            }
        }
        return outstanding;
    }

    /**
     * Returns true if all required milestones are completed.
     */
    public isRehabilitated(): boolean {
        if (this.cooldownExpiresAt === 0) return true;
        for (const completed of this.rehabilitationMilestones.values()) {
            if (!completed) return false;
        }
        return true;
    }

    /**
     * Checks if cooldown is active and gets remaining time
     */
    public getCooldownRemainingMs(): number {
        const currentTime = Date.now();
        if (currentTime < this.cooldownExpiresAt) {
            return this.cooldownExpiresAt - currentTime;
        }
        if (this.cooldownExpiresAt > 0 && !this.isRehabilitated()) {
            // Time has expired but rehabilitation conditions are not yet met!
            return 1000;
        }
        return 0;
    }

    /**
     * Decays/expels stale scar tissue warnings that are older than maxAgeMs.
     * Default decay cutoff is 30 days (2592000000 ms).
     */
    public decayScarTissue(maxAgeMs: number = 2592000000): void {
        const cutoffTime = Date.now() - maxAgeMs;
        this.scarTissue = this.scarTissue.filter(s => s.timestamp >= cutoffTime);
    }

    /**
     * Gets all active (undecayed) governance scar tissue warnings.
     * Automatically applies decay filter before returning.
     */
    public getScarTissue(): string[] {
        this.decayScarTissue();
        return this.scarTissue.map(s => s.warning);
    }

    /**
     * Request a temporary thaw window. Requires at least 2 distinct, authorized SRE operator keys.
     * If thaw normalization risk is high (risk >= 0.75), dynamic consensus elevates the threshold to 3 keys.
     * Enforces thaw exhaustion budgeting & cooldowns.
     */
    public requestThaw(operatorKeys: string[], durationMs: number, domain: string = 'DEFAULT'): ThawSession {
        const timestamp = Date.now();
        
        // 1. Enforce Cooldown Check
        const remainingCooldown = this.getCooldownRemainingMs();
        if (remainingCooldown > 0) {
            const errorMsg = `Thaw request denied: Cooldown period active. Thaw exhaustion threshold breached. Cooldown remaining: ${(remainingCooldown / 1000).toFixed(1)}s. Outstanding rehabilitation milestones: ${this.getOutstandingMilestones().join(', ')}`;
            this.logAudit('COOLDOWN_ACTIVE_DENIED', {
                timestamp,
                remainingCooldownMs: remainingCooldown,
                outstandingMilestones: this.getOutstandingMilestones()
            });
            throw new Error(errorMsg);
        } else if (this.cooldownExpiresAt > 0 && timestamp >= this.cooldownExpiresAt && this.isRehabilitated()) {
            // Reset elevated count after cooldown expires AND rehabilitated
            this.elevatedThawsCount = 0;
            this.cooldownExpiresAt = 0;
            this.logAudit('COOLDOWN_EXPIRED_RESET', { timestamp });
        }

        // 2. Audit unique, authorized keys
        const uniqueKeys = Array.from(new Set(operatorKeys));
        const validKeys = uniqueKeys.filter(k => this.authorizedSreKeys.has(k));

        // 3. Perform Thaw Normalization Audit
        const normReport = this.auditThawNormalization();
        const requiredSignatures = normReport.requiresElevatedConsensus ? 3 : 2;

        if (validKeys.length < requiredSignatures) {
            const errorMsg = `Thaw request denied: insufficient authorized signatures. Normalization risk: ${(normReport.normalizationRiskIndex * 100).toFixed(0)}%. Required signatures: ${requiredSignatures}, Provided: ${validKeys.length}.`;
            
            this.thawRequestsHistory.push({
                timestamp,
                operators: validKeys,
                domain,
                success: false
            });

            this.logAudit('THAW_DENIED', {
                reason: 'INSUFFICIENT_SIGNATURES',
                requiredSignatures,
                providedCount: validKeys.length,
                normalizationRisk: normReport.normalizationRiskIndex
            });
            throw new Error(errorMsg);
        }

        // Cap maximum duration to 1 hour (3600000ms)
        const maxDurationMs = 3600000;
        const boundedDuration = Math.min(durationMs, maxDurationMs);

        const sessionId = `thaw-session-${Math.random().toString(36).substring(2, 11)}`;
        const session: ThawSession = {
            sessionId,
            startTime: timestamp,
            expiryTime: timestamp + boundedDuration,
            authorizedOperators: validKeys,
            isActive: true,
            domain
        };

        this.activeSessions.set(sessionId, session);
        this.thawRequestsHistory.push({
            timestamp,
            operators: validKeys,
            domain,
            success: true
        });

        // 4. Update Thaw Exhaustion Budgeting
        if (normReport.requiresElevatedConsensus) {
            this.elevatedThawsCount++;
            
            if (this.elevatedThawsCount >= 3) {
                this.cooldownExpiresAt = timestamp + this.cooldownDurationMs;
                this.rehabilitationMilestones.set('ARCHAEOLOGY_REVIEW', false);
                this.rehabilitationMilestones.set('SIMPLIFICATION_CAMPAIGN', false);
                this.rehabilitationMilestones.set('ROOT_CAUSE_DOC', false);
                this.rehabilitationMilestones.set('TELEMETRY_REDUCTION', false);

                const scarWarning = `Governance Scar Tissue: Repeated elevated thaws in domain '${domain}' detected. mandatory cooldown initiated. Requires mandatory archaeology review and freeze re-certification.`;
                this.scarTissue.push({ timestamp, warning: scarWarning });
                this.logAudit('COOLDOWN_TRIGGERED', {
                    domain,
                    expiresAt: this.cooldownExpiresAt,
                    elevatedCount: this.elevatedThawsCount
                });
            }
        }

        this.logAudit('THAW_GRANTED', {
            sessionId,
            durationMs: boundedDuration,
            authorizedOperators: validKeys,
            domain,
            normalizationRisk: normReport.normalizationRiskIndex,
            elevatedCount: this.elevatedThawsCount
        });

        return session;
    }

    /**
     * Checks if a modification is allowed under the given session.
     */
    public checkModificationAllowed(sessionId: string): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            return false;
        }

        const currentTime = Date.now();
        if (!session.isActive) {
            return false;
        }

        if (currentTime > session.expiryTime) {
            session.isActive = false;
            this.logAudit('THAW_EXPIRED', {
                sessionId: session.sessionId,
                expiredAt: session.expiryTime
            });
            return false;
        }

        return true;
    }

    /**
     * Audits thaw history to calculate frequency slope, operator concentration, and normalization risk.
     */
    public auditThawNormalization(): ThawNormalizationReport {
        const successfulThaws = this.thawRequestsHistory
            .filter(t => t.success)
            .sort((a, b) => a.timestamp - b.timestamp);
        const totalThawsRequested = successfulThaws.length;

        if (totalThawsRequested === 0) {
            return {
                totalThawsRequested: 0,
                thawFrequencySlope: 0.0,
                operatorConcentration: 0.0,
                normalizationRiskIndex: 0.0,
                frequentThawDomains: {},
                requiresElevatedConsensus: false
            };
        }

        const operatorCounts = new Map<string, number>();
        let totalOperatorSignatures = 0;
        for (const thaw of successfulThaws) {
            for (const op of thaw.operators) {
                operatorCounts.set(op, (operatorCounts.get(op) || 0) + 1);
                totalOperatorSignatures++;
            }
        }

        let hhi = 0.0;
        if (totalOperatorSignatures > 0) {
            for (const count of operatorCounts.values()) {
                const proportion = count / totalOperatorSignatures;
                hhi += proportion * proportion;
            }
        }

        let thawFrequencySlope = 0.0;
        if (totalThawsRequested >= 2) {
            const midTime = (successfulThaws[0].timestamp + successfulThaws[successfulThaws.length - 1].timestamp) / 2;
            const earlyCount = successfulThaws.filter(t => t.timestamp <= midTime).length;
            const lateCount = successfulThaws.filter(t => t.timestamp > midTime).length;
            
            thawFrequencySlope = earlyCount > 0 ? (lateCount - earlyCount) / earlyCount : 0.0;
        }

        const frequentThawDomains: Record<string, number> = {};
        for (const thaw of successfulThaws) {
            frequentThawDomains[thaw.domain] = (frequentThawDomains[thaw.domain] || 0) + 1;
        }

        const normalizedConcentration = Math.min(hhi * 2.0, 1.0);
        const countWeight = Math.min(totalThawsRequested / 10, 1.0) * 0.30;
        const slopeWeight = Math.max(0.0, Math.min(thawFrequencySlope, 2.0)) / 2.0 * 0.35;
        const concWeight = normalizedConcentration * 0.35;
        
        let normalizationRiskIndex = countWeight + slopeWeight + concWeight;
        normalizationRiskIndex = Math.min(1.0, Math.round(normalizationRiskIndex * 100) / 100);

        const requiresElevatedConsensus = normalizationRiskIndex >= 0.75;

        return {
            totalThawsRequested,
            thawFrequencySlope: Math.round(thawFrequencySlope * 100) / 100,
            operatorConcentration: Math.round(normalizedConcentration * 100) / 100,
            normalizationRiskIndex,
            frequentThawDomains,
            requiresElevatedConsensus
        };
    }

    /**
     * Helper to manually populate mock history for testing.
     */
    public injectMockThawHistory(record: { timestamp: number; operators: string[]; domain: string; success: boolean }): void {
        this.thawRequestsHistory.push(record);
    }

    /**
     * Explicitly revokes/closes a thaw session early.
     */
    public revokeThaw(sessionId: string, reason: string): void {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.isActive = false;
            session.revocationReason = reason;
            this.logAudit('THAW_REVOKED', {
                sessionId,
                reason
            });
        }
    }

    /**
     * Gets all audit logs.
     */
    public getAuditLogs() {
        return [...this.auditLogs];
    }

    private logAudit(action: string, details: Record<string, any>): void {
        this.auditLogs.push({
            timestamp: Date.now(),
            action,
            details
        });
    }
}
