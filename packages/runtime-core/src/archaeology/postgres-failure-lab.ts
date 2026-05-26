export interface LabCampaignResult {
    campaignId: string;
    drillName: string;
    timestamp: number;
    injectedFailures: string[];
    observedMetrics: Record<string, any>;
    recoveryDurationMs: number;
    reconciliationVerdict: 'RECOVERED' | 'DEGRADED' | 'FORENSIC_MUTATION_BLOCKED';
}

export class PostgresFailureLab {
    private isProdSim: boolean;

    constructor(isProdSim: boolean = true) {
        this.isProdSim = isProdSim;
    }

    /**
     * Orchestrates WAL archive stalls, measuring replication divergence and standbys fallouts.
     */
    public async orchestrateWalStallCampaign(): Promise<LabCampaignResult> {
        console.log('[PostgresFailureLab] Injecting WAL archive stall: blocking archive_command...');
        
        const injectedFailures = ['archive_command_block', 'replica_wal_feed_disconnect'];
        const startTime = Date.now();

        // Simulate campaign progression
        await sleep(50); 

        const observedMetrics = {
            walSegmentsAccumulated: 342,
            replicationLagBytes: 576716800, // 550MB
            activeStandbys: 0,
            archiveQueueSize: 341
        };

        return {
            campaignId: `wal_stall_${Date.now()}`,
            drillName: 'WAL Archive Stall & Replica Desync',
            timestamp: Date.now(),
            injectedFailures,
            observedMetrics,
            recoveryDurationMs: Date.now() - startTime + 12000, // emulated recovery delay
            reconciliationVerdict: 'RECOVERED'
        };
    }

    /**
     * Orchestrates write storms while blocking autovacuum to check bloat thresholds and XID aging.
     */
    public async orchestrateAutovacuumStarvationCampaign(): Promise<LabCampaignResult> {
        console.log('[PostgresFailureLab] Triggering write storm with autovacuum disabled...');

        const injectedFailures = ['autovacuum_disabled', 'concurrent_write_storm_10krps'];
        const startTime = Date.now();

        await sleep(50);

        const observedMetrics = {
            deadTuplesCount: 14500000,
            indexBloatRatio: 2.85, // 285% size expansion
            xidAgeSeconds: 28000,
            transactionIdIncrement: 250000000 // 250 million XIDs consumed
        };

        return {
            campaignId: `vac_starve_${Date.now()}`,
            drillName: 'Autovacuum Collapse & XID Inflation',
            timestamp: Date.now(),
            injectedFailures,
            observedMetrics,
            recoveryDurationMs: Date.now() - startTime + 8500,
            reconciliationVerdict: 'RECOVERED'
        };
    }

    /**
     * Simulates prepared 2PC transactions leaking across database reboots.
     */
    public async orchestratePreparedTxLeakCampaign(txCount: number = 5): Promise<LabCampaignResult> {
        console.log(`[PostgresFailureLab] Leaking ${txCount} prepared 2PC transactions across simulated restart...`);

        const injectedFailures = ['prepared_2pc_abandoned', 'dirty_restart'];
        const startTime = Date.now();

        await sleep(50);

        const abandonedXids = Array.from({ length: txCount }, (_, i) => `xid_prep_${200 + i}`);
        const observedMetrics = {
            leaked2pcCount: txCount,
            oldestPreparedTxAgeSec: 7200, // 2 hours
            lockedSharedBuffersBytes: 134217728, // 128MB memory pinned
            activeLocksBlockedCount: 18
        };

        return {
            campaignId: `prep_tx_leak_${Date.now()}`,
            drillName: 'Prepared Transaction Leak & Memory Lock Cache Pinning',
            timestamp: Date.now(),
            injectedFailures,
            observedMetrics,
            recoveryDurationMs: Date.now() - startTime + 15000,
            reconciliationVerdict: 'DEGRADED' // Leaked transactions require manual cleanup/verification
        };
    }

    /**
     * Simulates split-brain standby promotion races and fencing lease conflicts.
     */
    public async orchestrateReplicaPromotionRace(): Promise<LabCampaignResult> {
        console.log('[PostgresFailureLab] Simulating master partition and dual standby promotion race...');

        const injectedFailures = ['primary_network_partition', 'dual_standby_promotion_race'];
        const startTime = Date.now();

        await sleep(50);

        const observedMetrics = {
            masterHeartbeatFailures: 3,
            promotedStandbyNodes: ['standby_node_a', 'standby_node_b'],
            splitBrainConflictDurationSec: 4,
            fencingActionsTriggered: 2,
            fencingSuccess: true
        };

        return {
            campaignId: `promo_race_${Date.now()}`,
            drillName: 'Split-Brain Standby Promotion Race & Fencing Leases',
            timestamp: Date.now(),
            injectedFailures,
            observedMetrics,
            recoveryDurationMs: Date.now() - startTime + 4000,
            reconciliationVerdict: 'RECOVERED'
        };
    }

    /**
     * Simulates high frequency checkpoint thrashing during disk saturation limits.
     */
    public async orchestrateCheckpointThrashCampaign(): Promise<LabCampaignResult> {
        console.log('[PostgresFailureLab] Saturating disk IO to trigger checkpoint starvation...');

        const injectedFailures = ['disk_io_saturation_100pct', 'checkpoint_completion_target_exceeded'];
        const startTime = Date.now();

        await sleep(50);

        const observedMetrics = {
            checkpointSyncTimeMs: 45000, // 45 seconds sync
            dirtyPageBufferBytes: 1073741824, // 1GB dirty pages
            checkpointWriteIops: 25000,
            ioLatencyMs: 450
        };

        return {
            campaignId: `checkpoint_thrash_${Date.now()}`,
            drillName: 'Checkpoint Thrashing & Disk Saturation',
            timestamp: Date.now(),
            injectedFailures,
            observedMetrics,
            recoveryDurationMs: Date.now() - startTime + 22000,
            reconciliationVerdict: 'DEGRADED'
        };
    }

    /**
     * Simulates recovery failure under storage exhaustion boundaries.
     */
    public async orchestrateDiskFullCampaign(filledDiskBytes: number): Promise<LabCampaignResult> {
        console.log(`[PostgresFailureLab] Simulating storage exhaustion. Filled space: ${(filledDiskBytes / (1024 * 1024)).toFixed(0)}MB...`);

        const injectedFailures = ['storage_exhaustion_100pct', 'wal_write_failed'];
        const startTime = Date.now();

        await sleep(50);

        const observedMetrics = {
            diskFreeBytes: 0,
            failedWalWritesCount: 57,
            recoveryFailureCode: 'PANIC_DISK_FULL',
            readOnlyModeActive: true
        };

        return {
            campaignId: `disk_full_${Date.now()}`,
            drillName: 'Storage Exhaustion & WAL Recovery Panic',
            timestamp: Date.now(),
            injectedFailures,
            observedMetrics,
            recoveryDurationMs: Date.now() - startTime + 30000,
            reconciliationVerdict: 'FORENSIC_MUTATION_BLOCKED' // Writes fail, mutative recovery blocked
        };
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
