import dotenv from 'dotenv';
dotenv.config();

import {
    SubsystemRetirementEvaluator,
    GovernanceResurrectionRegistry,
    HistoricalReplayCompatibility,
    ReversibleCompressionEngine,
    StewardshipMemoryPreservator,
    FreezeEscapeCoordinator,
    TelemetryEvent,
    RetiredSubsystemMetadata,
    SchemaMigration,
    ArchivedValidator,
    DecisionRecord,
    OperatorRationale,
    ResurrectionRequest,
    SuccessionSimulator
} from '../packages/runtime-core/src/index';

async function runPhase25Verification() {
    console.log('================================================================================');
    console.log('🧪  ZTAN PHASE 25 — REVERSIBLE STEWARDSHIP & HISTORICAL RESURRECTION DRILLS');
    console.log('================================================================================\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 1: Subsystem Retirement Evaluator & Catastrophic Optionality
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 1] Testing Subsystem Retirement Evaluator (Catastrophic Optionality)...');
    const evaluator = new SubsystemRetirementEvaluator();

    const criticalRareSubsystem = {
        name: 'BlackSwanRecoveryDriver',
        loc: 400,
        incidentsAlerted: 0,
        incidentsResolved: 0,
        falsePositiveAlerts: 0,
        operatorViewsCount: 0,
        catastrophicOptionalityWeight: 0.85
    };
    
    const reportCritical = evaluator.evaluateRetirement(criticalRareSubsystem);
    console.log(`     - ${reportCritical.subsystemName}: EfficacyScore=${reportCritical.efficacyScore}, isEligible=${reportCritical.isEligibleForRetirement}`);
    if (reportCritical.isEligibleForRetirement || !reportCritical.reason.includes('Catastrophic Optionality')) {
        throw new Error('SubsystemRetirementEvaluator failed to protect high catastrophic optionality subsystem from retirement!');
    }

    const noisyUselessSubsystem = {
        name: 'StaleSidecarLogger',
        loc: 350,
        incidentsAlerted: 10,
        incidentsResolved: 0,
        falsePositiveAlerts: 40,
        operatorViewsCount: 0,
        catastrophicOptionalityWeight: 0.15
    };

    const reportNoisy = evaluator.evaluateRetirement(noisyUselessSubsystem);
    console.log(`     - ${reportNoisy.subsystemName}: EfficacyScore=${reportNoisy.efficacyScore}, isEligible=${reportNoisy.isEligibleForRetirement}`);
    if (!reportNoisy.isEligibleForRetirement) {
        throw new Error('SubsystemRetirementEvaluator did not recommend low catastrophic optionality subsystem for retirement!');
    }

    console.log('  ✅ Subsystem Retirement Evaluator updates verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 2: Governance Resurrection Registry (Structured Gates & Certification)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 2] Testing Governance Resurrection Registry (Friction & Certification)...');
    const registry = new GovernanceResurrectionRegistry(['DbConnectionPool']);

    const retiredMeta: RetiredSubsystemMetadata = {
        name: 'QueryPerformanceOptimizer',
        type: 'subsystem',
        retiredAt: new Date(),
        provenance: {
            gitCommit: 'a1b2c3d4',
            retiredBy: 'operator-alice',
            reason: 'footprint minimization'
        },
        dependencies: ['DbConnectionPool'],
        restorationPrerequisites: ['ENABLE_SLOW_QUERY_LOG'],
        historicalEfficacy: 0.78,
        payload: { maxPoolSize: 100, logQueryThresholdMs: 2000 }
    };

    registry.registerRetirement(retiredMeta);

    // Case A: Deny due to unstructured / incomplete fields validation
    const invalidRequestFields: ResurrectionRequest = {
        restorationReason: 'short reason', // too short (< 15)
        expectedBlastRadius: 'MEDIUM',
        survivabilityCategory: 'operational',
        reRetirementCondition: 'short condition', // too short (< 15)
        telemetryDeltaEstimate: 0.05,
        rollbackPlan: 'rollback plan description', // valid (> 15)
        sunsetDays: 14
    };
    const reportFrictionFields = registry.resurrectSubsystem('QueryPerformanceOptimizer', invalidRequestFields, { ENABLE_SLOW_QUERY_LOG: true });
    console.log(`     - Structured fields gate: success=${reportFrictionFields.success}, error="${reportFrictionFields.error}"`);
    if (reportFrictionFields.success || !reportFrictionFields.error?.includes('restorationReason must be at least 15 characters')) {
        throw new Error('Registry failed to block resurrection with short structured fields!');
    }

    // Case B: Deny due to environment pre-flight certification failure
    const validRequest: ResurrectionRequest = {
        restorationReason: 'Investigating query pool exhaustion during high workload',
        expectedBlastRadius: 'MEDIUM',
        survivabilityCategory: 'operational',
        reRetirementCondition: 'Active DB workload drops below 50% CPU capacity',
        telemetryDeltaEstimate: 0.12,
        rollbackPlan: 'Uninstall resurrected validator and restore connection pool limits',
        sunsetDays: 30
    };
    // Injecting missing telemetry fields into environment
    const reportCertFail = registry.resurrectSubsystem('QueryPerformanceOptimizer', validRequest, { 
        ENABLE_SLOW_QUERY_LOG: true,
        MISSING_TELEMETRY_FIELDS: true // triggers certification issue
    });
    console.log(`     - Certification pre-flight: success=${reportCertFail.success}, issues=${JSON.stringify(reportCertFail.certificationReport?.issues)}`);
    if (reportCertFail.success || reportCertFail.certificationReport?.certified === true || !reportCertFail.error?.includes('compatibility certification failed')) {
        throw new Error('Registry allowed resurrection despite environment compatibility check failures!');
    }

    // Case C: Success under valid classification AND certified environment
    const reportSuccess = registry.resurrectSubsystem('QueryPerformanceOptimizer', validRequest, { ENABLE_SLOW_QUERY_LOG: true });
    console.log(`     - Successful resurrection: success=${reportSuccess.success}, certified=${reportSuccess.certificationReport?.certified}`);
    console.log(`       └─ Complexity Debt:`, JSON.stringify(reportSuccess.complexityDebt));
    
    if (!reportSuccess.success || !reportSuccess.complexityDebt || !reportSuccess.certificationReport?.certified) {
        throw new Error('Resurrection failed under valid justification and certified environment!');
    }

    console.log('  ✅ Governance Resurrection Registry (Friction & Certification) verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 3: Historical Replay Compatibility Layer
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 3] Testing Historical Replay Compatibility Layer...');
    const compatibility = new HistoricalReplayCompatibility();

    const migration: SchemaMigration = {
        sourceVersion: 'v2026',
        targetVersion: 'v2029',
        transform: (evt: any) => {
            return {
                id: evt.event_id,
                type: evt.evt_type,
                timestamp: evt.epoch_time,
                entropyScore: evt.anomaly_factor ?? 0.0,
                payload: {
                    legacyField: evt.old_info,
                    upgraded: true
                }
            };
        }
    };
    compatibility.registerMigration(migration);

    const validator: ArchivedValidator = {
        ruleName: 'MaxCpuThresholdRule',
        version: 'v1.0',
        validate: (inputs: Record<string, any>) => {
            return inputs.cpuUsagePercent < 90;
        }
    };
    compatibility.registerArchivedValidator(validator);

    const legacyEvent = {
        event_id: 'legacy-101',
        evt_type: 'METRIC_SPIKE',
        epoch_time: 1774567890000,
        anomaly_factor: 0.75,
        old_info: 'cpu limit crossed'
    };
    const reconstructed = compatibility.reconstructLegacyEvent(legacyEvent, 'v2026', 'v2029');
    console.log(`     - Reconstructed Event: ID=${reconstructed.id}, Type=${reconstructed.type}, payload=${JSON.stringify(reconstructed.payload)}`);
    if (reconstructed.id !== 'legacy-101' || reconstructed.type !== 'METRIC_SPIKE' || !reconstructed.payload.upgraded) {
        throw new Error('HistoricalReplayCompatibility failed to transform legacy event correctly!');
    }

    const validationSuccess = compatibility.emulateArchivedValidator('MaxCpuThresholdRule', 'v1.0', { cpuUsagePercent: 85 });
    const validationFailure = compatibility.emulateArchivedValidator('MaxCpuThresholdRule', 'v1.0', { cpuUsagePercent: 95 });
    console.log(`     - Archived Validator: expected success=${validationSuccess}, expected failure=${validationFailure}`);
    if (!validationSuccess || validationFailure) {
        throw new Error('HistoricalReplayCompatibility failed to validate emulated validator!');
    }

    console.log('  ✅ Historical Replay Compatibility Layer verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 4: Reversible Compression Engine
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 4] Testing Reversible Compression Engine...');
    const compressionEngine = new ReversibleCompressionEngine();

    const rawEvents: TelemetryEvent[] = [
        { id: 'e1', type: 'CPU_IDLE', timestamp: 1000, entropyScore: 0.1, payload: { value: 95 } },
        { id: 'e2', type: 'DISK_ANOMALY', timestamp: 2000, entropyScore: 0.82, payload: { disk_latency_ms: 120 } },
        { id: 'e3', type: 'NET_DROPPED', timestamp: 3000, entropyScore: 0.45, payload: { packets: 12 } },
        { id: 'e4', type: 'OUT_OF_MEMORY', timestamp: 4000, entropyScore: 0.95, payload: { heap_used_mb: 4096 } }
    ];

    const narrative = compressionEngine.compressToNarrative(rawEvents, 'RESOURCE_SATURATION');
    console.log(`     - Compressed Narrative Summary: "${narrative.summary}"`);
    
    const level0Events = compressionEngine.expandNarrative(narrative, 0);
    console.log(`     - Level 0 Detail: count=${level0Events.length} (expected: 2: e2, e4)`);
    if (level0Events.length !== 2 || !level0Events.some(e => e.id === 'e2') || !level0Events.some(e => e.id === 'e4')) {
        throw new Error('ReversibleCompressionEngine Level 0 expansion incorrect!');
    }

    const level1Events = compressionEngine.expandNarrative(narrative, 1);
    console.log(`     - Level 1 Detail: count=${level1Events.length} (expected: 3: e2, e3, e4)`);
    if (level1Events.length !== 3 || level1Events.some(e => e.id === 'e1')) {
        throw new Error('ReversibleCompressionEngine Level 1 expansion incorrect!');
    }

    const level2Events = compressionEngine.expandNarrative(narrative, 2);
    console.log(`     - Level 2 Detail: count=${level2Events.length} (expected: 4)`);
    if (level2Events.length !== 4) {
        throw new Error('ReversibleCompressionEngine Level 2 expansion incorrect!');
    }

    console.log('  ✅ Reversible Compression Engine verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 5: Stewardship Memory Preservator (Bias & Prediction Auditing)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 5] Testing Stewardship Memory Preservator (Bias & Prediction Auditing)...');
    const memoryPreservator = new StewardshipMemoryPreservator();

    const rationale: OperatorRationale = {
        overrideId: 'override-99',
        rationale: 'Temporary override of WAL locks during VM disk flush delay',
        operatorName: 'SreBob',
        timestamp: Date.now(),
        playbookLineage: 'WAL Corruption Recovery Drill v2',
        decisionProvenance: 'Incident-505',
        overrideRationale: 'System was deadlocked',
        abandonedTelemetryAncestry: ['wal_sync_delay_ms'],
        context: { disk_latency: 500 }
    };
    memoryPreservator.recordOperatorRationale(rationale);

    const historicalDecisions: DecisionRecord[] = [
        { decisionId: 'd1', operatorName: 'SreBob', timestamp: 1000, chosenHypothesis: 'WAL_STALL', alternativeHypotheses: ['PG_CONN_STORM'], actualOutcomeRootCause: 'PG_CONN_STORM', confidenceLevel: 'HIGH' },
        { decisionId: 'd2', operatorName: 'SreBob', timestamp: 2000, chosenHypothesis: 'WAL_STALL', alternativeHypotheses: ['PG_CONN_STORM'], actualOutcomeRootCause: 'PG_CONN_STORM', confidenceLevel: 'HIGH' },
        { decisionId: 'd3', operatorName: 'SreBob', timestamp: 3000, chosenHypothesis: 'WAL_STALL', alternativeHypotheses: ['PG_CONN_STORM'], actualOutcomeRootCause: 'PG_CONN_STORM', confidenceLevel: 'HIGH' },
        { decisionId: 'd4', operatorName: 'SreAlice', timestamp: 4000, chosenHypothesis: 'DISK_FULL', alternativeHypotheses: ['WAL_STALL'], actualOutcomeRootCause: 'DISK_FULL', confidenceLevel: 'HIGH' },
        { decisionId: 'd5', operatorName: 'SreAlice', timestamp: 5000, chosenHypothesis: 'NTP_DRIFT', alternativeHypotheses: [], actualOutcomeRootCause: 'NTP_DRIFT', confidenceLevel: 'MEDIUM' }
    ];

    const decayReport = memoryPreservator.auditHypothesisDecay(historicalDecisions);
    console.log(`     - Audited Decisions: total=${decayReport.totalDecisionsAudited}, accuracyRate=${decayReport.accuracyRate}`);
    for (const pattern of decayReport.recurringBiasPatterns) {
        console.log(`       ├─ Bias: "${pattern}"`);
    }

    if (decayReport.accuracyRate !== 0.40 || decayReport.wrongPathwaysCount !== 3) {
        throw new Error('StewardshipMemoryPreservator calculated incorrect decay statistics!');
    }

    // Register operator roles for authority weighting
    memoryPreservator.registerOperatorSeniority('SreBob', 'LEAD');
    memoryPreservator.registerOperatorSeniority('SreAlice', 'SENIOR');

    // Resurrection prediction auditing validation
    const resRecords = [
        {
            resurrectionId: 'r1',
            subsystemName: 'QueryPerformanceOptimizer',
            operatorName: 'SreBob', // LEAD operator
            timestamp: Date.now(),
            requestContext: {
                restorationReason: 'Network performance investigation',
                expectedBlastRadius: 'LOW' as const,
                survivabilityCategory: 'operational' as const,
                reRetirementCondition: 'workload stabilized',
                telemetryDeltaEstimate: 0.1,
                rollbackPlan: 'restore settings',
                sunsetDays: 14
            }
        },
        {
            resurrectionId: 'r2',
            subsystemName: 'QueryPerformanceOptimizer',
            operatorName: 'SreAlice', // SENIOR operator
            timestamp: Date.now() - 3600000, // 1 hour ago (triggers temporal clustering!)
            requestContext: {
                restorationReason: 'Pool exhaustion diagnostics',
                expectedBlastRadius: 'LOW' as const,
                survivabilityCategory: 'operational' as const,
                reRetirementCondition: 'load reduced',
                telemetryDeltaEstimate: 0.05,
                rollbackPlan: 'restore limits',
                sunsetDays: 7,
                coSignatures: ['SreBob'] // high seniority co-signer (propagates contagion)
            }
        }
    ];
    const actualOutcomes = [
        {
            resurrectionId: 'r1',
            actualBlastRadius: 'MEDIUM' as const, // Underestimated blast radius (predicted LOW < actual MEDIUM)
            actualTelemetryDelta: 0.45,          // Underestimated telemetry delta (predicted 0.1 < actual 0.45)
            actualMaintenanceBurden: 80,
            actualSurvivabilityGain: 'MEDIUM' as const
        },
        {
            resurrectionId: 'r2',
            actualBlastRadius: 'HIGH' as const,   // Underestimated blast radius (predicted LOW < actual HIGH)
            actualTelemetryDelta: 0.60,          // Underestimated telemetry delta (predicted 0.05 < actual 0.60)
            actualMaintenanceBurden: 120,
            actualSurvivabilityGain: 'HIGH' as const
        }
    ];

    const predAudit = memoryPreservator.auditResurrectionPredictions(resRecords, actualOutcomes);
    console.log(`     - Prediction Audit: averageAccuracy=${predAudit.averagePredictionAccuracy}`);
    for (const w of predAudit.warnings) {
        console.log(`       ├─ Warning: "${w}"`);
    }

    if (predAudit.underestimatedBlastRadiusCount !== 2 || predAudit.underestimatedTelemetryDeltaCount !== 2) {
        throw new Error('Prediction auditing failed to count underestimations correctly!');
    }
    if (!predAudit.warnings.some(w => w.includes('Optimism Bias detected'))) {
        throw new Error('Prediction auditing failed to alert on individual SRE forecasting optimism bias!');
    }

    // Verify Group Consensus Bias calculations
    const gcb = predAudit.groupConsensusBias;
    console.log(`     - Group Consensus Bias: detected=${gcb?.consensusOptimismDetected}, groupBiasScore=${gcb?.groupResurrectionBiasScore}`);
    if (!gcb) {
        throw new Error('Group Consensus Bias report is missing!');
    }
    // group bias score should reflect the seniority weight amplification and clustering
    if (gcb.groupResurrectionBiasScore <= 0.50) {
        throw new Error(`Expected weighted group resurrection bias score to be highly elevated, got ${gcb.groupResurrectionBiasScore}`);
    }
    if (!gcb.consensusOptimismDetected) {
        throw new Error('Expected group consensus optimism to be detected!');
    }
    if (gcb.correlatedForecastingFailures.length !== 1) {
        throw new Error('Expected 1 correlated forecasting failure on QueryPerformanceOptimizer!');
    }
    
    // Verify temporal clustering and confidence contagion
    console.log(`     - Temporal Clustering: detected=${gcb.temporalClusteringDetected}`);
    console.log(`     - Confidence Contagion Factor: ${gcb.confidenceContagionFactor}`);
    
    if (!gcb.temporalClusteringDetected) {
        throw new Error('Failed to detect temporal clustering for underestimations within 1 hour!');
    }
    if (gcb.confidenceContagionFactor <= 1.0) {
        throw new Error(`Expected elevated confidence contagion factor, got ${gcb.confidenceContagionFactor}`);
    }

    const corrFailure = gcb.correlatedForecastingFailures[0];
    console.log(`       ├─ Correlated Failure Subsystem: ${corrFailure.subsystemName}`);
    console.log(`       ├─ Operators Involved: ${corrFailure.operatorsInvolved.join(', ')}`);
    console.log(`       ├─ Underestimated Fields: ${corrFailure.underestimatedFields.join(', ')}`);
    console.log(`       ├─ Severity Score: ${corrFailure.severityScore}`);
    console.log(`       └─ Contagion Index: ${corrFailure.contagionIndex}`);

    if (corrFailure.subsystemName !== 'QueryPerformanceOptimizer') {
        throw new Error('Incorrect subsystem listed in correlated forecasting failure!');
    }
    if (!corrFailure.operatorsInvolved.includes('SreBob') || !corrFailure.operatorsInvolved.includes('SreAlice')) {
        throw new Error('Correlated failure did not list both operators SreBob and SreAlice!');
    }
    if (!corrFailure.underestimatedFields.includes('blastRadius') || !corrFailure.underestimatedFields.includes('telemetryDelta')) {
        throw new Error('Correlated failure did not list both blastRadius and telemetryDelta fields!');
    }
    if (corrFailure.contagionIndex <= 1.0) {
        throw new Error(`Expected elevated correlated contagion index, got ${corrFailure.contagionIndex}`);
    }

    console.log('  ✅ Stewardship Memory Preservator verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 6: Freeze Escape Coordinator (Exhaustion & Cooldowns)
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 6] Testing Freeze Escape Coordinator (Thaw Exhaustion & Cooldown Rehabilitation)...');
    const freezeCoordinator = new FreezeEscapeCoordinator(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie', 'key-sre-dave']);

    // Set cooldown duration to 1000ms for testing
    freezeCoordinator.setCooldownDuration(1000);

    // Case A: Verify normal request requires 2 signatures
    const normalSession = freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob'], 10000, 'NET_CONFIG');
    console.log(`     - Normal Thaw Session Granted: id=${normalSession.sessionId}, domain=${normalSession.domain}`);

    // Inject repeated, highly concentrated thaws by SreAlice & SreBob to trigger normalization risk
    const baseTime = Date.now() - 500000;
    
    // Inject mock thaws to spike HHI concentration and slope
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 50000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 350000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 400000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 450000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 460000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 470000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    freezeCoordinator.injectMockThawHistory({ timestamp: baseTime + 480000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });

    // Case B: Trigger 3 thaws requiring elevated consensus to breach exhaustion budget
    // We already have high normalization risk. Let's do 3 elevated requests.
    
    // Elevated Thaw 1
    freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');
    // Elevated Thaw 2
    freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');
    // Elevated Thaw 3 (should trigger cooldown immediately)
    freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');

    const remainingCooldown = freezeCoordinator.getCooldownRemainingMs();
    const scarTissue = freezeCoordinator.getScarTissue();
    console.log(`     - Cooldown triggered: remainingMs=${remainingCooldown}ms`);
    console.log(`     - Scar Tissue Recorded:`);
    for (const warning of scarTissue) {
        console.log(`       ├─ Warning: "${warning}"`);
    }

    if (remainingCooldown <= 0 || scarTissue.length === 0) {
        throw new Error('Expected FreezeEscapeCoordinator to trigger cooldown and record scar tissue warnings!');
    }

    // Case C: Try to request a 4th thaw during cooldown -> must be denied
    try {
        freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');
        throw new Error('Allowed thaw request during active cooldown block!');
    } catch (err: any) {
        console.log(`     - Expected failure during cooldown: "${err.message}"`);
        if (!err.message.includes('Cooldown period active')) {
            throw err;
        }
    }

    // Case D: Wait 1100ms for cooldown expiration
    console.log('     - Waiting for cooldown duration expiration (1100ms)...');
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Wait, let's verify that requesting thaw STILL fails because rehabilitation conditions are not yet met!
    try {
        freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');
        throw new Error('Allowed thaw request after time expired but before rehabilitation conditions completed!');
    } catch (err: any) {
        console.log(`     - Expected failure due to incomplete milestones: "${err.message}"`);
        if (!err.message.includes('Outstanding rehabilitation milestones')) {
            throw err;
        }
    }

    // Case E: Complete 3 of 4 milestones -> should still fail
    freezeCoordinator.completeRehabilitationMilestone('ARCHAEOLOGY_REVIEW');
    freezeCoordinator.completeRehabilitationMilestone('SIMPLIFICATION_CAMPAIGN');
    freezeCoordinator.completeRehabilitationMilestone('ROOT_CAUSE_DOC');
    try {
        freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');
        throw new Error('Allowed thaw request after partial rehabilitation completed!');
    } catch (err: any) {
        console.log(`     - Expected failure with remaining milestone: "${err.message}"`);
        if (!err.message.includes('Outstanding rehabilitation milestones: TELEMETRY_REDUCTION')) {
            throw err;
        }
    }

    // Case F: Complete final milestone -> must now succeed!
    freezeCoordinator.completeRehabilitationMilestone('TELEMETRY_REDUCTION');
    const postCooldownSession = freezeCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 5000, 'NET_CONFIG');
    console.log(`     - Granted post-rehabilitation session: id=${postCooldownSession.sessionId}, cooldownActive=${freezeCoordinator.getCooldownRemainingMs() > 0}`);
    if (!postCooldownSession.isActive || freezeCoordinator.getCooldownRemainingMs() > 0) {
        throw new Error('Thaw request failed to execute cleanly after full rehabilitation!');
    }

    console.log('  ✅ Freeze Escape Coordinator (Thaw Exhaustion & Cooldowns) verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 7: Succession Simulation
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 7] Testing Succession Simulation...');
    const successionSimulator = new SuccessionSimulator();

    const successionInput = {
        playbooks: [
            { name: 'NTP Synchronization Guide', clarityScore: 0.85, stepByStepGuideAvailable: true, updatedWithinDays: 30 },
            { name: 'Postgres Wraparound recovery', clarityScore: 0.50, stepByStepGuideAvailable: false, updatedWithinDays: 200 } // poor playbooks
        ],
        scarTissueWarnings: ['Scar Warning: repeated overrides in memory validator'],
        overrideRecords: [
            { overrideId: 'o1', hasStructuredRationale: true, hasCausalAncestry: true },
            { overrideId: 'o2', hasStructuredRationale: false, hasCausalAncestry: true } // untraceable overrides
        ],
        historicalThawsCount: 6
    };

    const successionReport = successionSimulator.simulateSuccession(successionInput);
    console.log(`     - Succession Readiness: Score=${successionReport.successionReadinessScore}, level=${successionReport.readinessLevel}`);
    console.log(`     - Playbook Coverage: ${successionReport.playbookCoverage}, Override Traceability: ${successionReport.overrideTraceability}`);
    for (const action of successionReport.remediationActions) {
        console.log(`       ├─ Action: "${action}"`);
    }

    if (successionReport.successionReadinessScore >= 0.80 || successionReport.readinessLevel === 'OPTIMAL') {
        throw new Error('SuccessionSimulator calculated incorrect succession readiness score/level under degraded data!');
    }

    console.log('  ✅ Succession Simulation verified.\n');

    // ────────────────────────────────────────────────────────────────────────
    // TEST 8: Decay-by-Default & Institutional Compaction
    // ────────────────────────────────────────────────────────────────────────
    console.log('⚡ [TEST 8] Testing Decay-by-Default & Institutional Compaction...');
    
    // 1. Scar Tissue Decay verification
    const decayCoordinator = new FreezeEscapeCoordinator(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie']);
    
    // Inject mock thaws to spike HHI concentration and slope
    const baseTimeT8 = Date.now() - 500000;
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 50000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 350000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 400000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 450000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 460000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 470000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    decayCoordinator.injectMockThawHistory({ timestamp: baseTimeT8 + 480000, operators: ['key-sre-alice', 'key-sre-bob'], domain: 'NET_CONFIG', success: true });
    
    decayCoordinator.setCooldownDuration(100);
    
    // Trigger 3 thaws requiring elevated consensus to breach budget
    decayCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 50, 'NET_CONFIG');
    decayCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 50, 'NET_CONFIG');
    decayCoordinator.requestThaw(['key-sre-alice', 'key-sre-bob', 'key-sre-charlie'], 50, 'NET_CONFIG'); // triggers cooldown & warning
    
    const initialScars = decayCoordinator.getScarTissue();
    console.log(`     - Initial Scar Tissue Warnings: count=${initialScars.length}`);
    if (initialScars.length !== 1) {
        throw new Error('Failed to record initial scar tissue warning!');
    }
    
    // Apply immediate decay (using negative age to force decay of all warnings)
    decayCoordinator.decayScarTissue(-1);
    const postDecayScars = decayCoordinator.getScarTissue();
    console.log(`     - Post-Decay Scar Tissue Warnings: count=${postDecayScars.length}`);
    if (postDecayScars.length !== 0) {
        throw new Error('Scar tissue warning failed to decay/expire!');
    }
    
    // 2. Institutional Compaction verification
    const forgettingPreservator = new StewardshipMemoryPreservator();
    const ninetyDaysAgo = Date.now() - (91 * 24 * 3600 * 1000);
    const recentTime = Date.now();
    
    forgettingPreservator.addDecisionRecord({
        decisionId: 'old-d1',
        operatorName: 'SreBob',
        timestamp: ninetyDaysAgo,
        chosenHypothesis: 'WAL_STALL',
        alternativeHypotheses: [],
        actualOutcomeRootCause: 'PG_CONN_STORM',
        confidenceLevel: 'HIGH'
    });
    
    forgettingPreservator.addDecisionRecord({
        decisionId: 'recent-d1',
        operatorName: 'SreBob',
        timestamp: recentTime,
        chosenHypothesis: 'DISK_FULL',
        alternativeHypotheses: [],
        actualOutcomeRootCause: 'DISK_FULL',
        confidenceLevel: 'HIGH'
    });

    forgettingPreservator.addResurrectionRecord({
        resurrectionId: 'old-r1',
        subsystemName: 'QueryPerformanceOptimizer',
        operatorName: 'SreBob',
        timestamp: ninetyDaysAgo,
        requestContext: {
            restorationReason: 'Stale query performance troubleshooting',
            expectedBlastRadius: 'LOW',
            survivabilityCategory: 'operational',
            reRetirementCondition: 'load reduced',
            telemetryDeltaEstimate: 0.1,
            rollbackPlan: 'restore settings',
            sunsetDays: 7
        }
    }, {
        resurrectionId: 'old-r1',
        actualBlastRadius: 'HIGH',
        actualTelemetryDelta: 0.5,
        actualMaintenanceBurden: 50,
        actualSurvivabilityGain: 'MEDIUM'
    });

    forgettingPreservator.addResurrectionRecord({
        resurrectionId: 'recent-r1',
        subsystemName: 'QueryPerformanceOptimizer',
        operatorName: 'SreBob',
        timestamp: recentTime,
        requestContext: {
            restorationReason: 'Active pool exhaustion troubleshoot',
            expectedBlastRadius: 'LOW',
            survivabilityCategory: 'operational',
            reRetirementCondition: 'load stabilized',
            telemetryDeltaEstimate: 0.1,
            rollbackPlan: 'restore limits',
            sunsetDays: 14
        }
    }, {
        resurrectionId: 'recent-r1',
        actualBlastRadius: 'LOW',
        actualTelemetryDelta: 0.1,
        actualMaintenanceBurden: 20,
        actualSurvivabilityGain: 'HIGH'
    });

    // Before compaction metrics
    const beforeAudit = forgettingPreservator.auditResurrectionPredictions();
    console.log(`     - Before Compaction: totalResurrections=${beforeAudit.totalAudited}`);
    if (beforeAudit.totalAudited !== 2) {
        throw new Error(`Expected 2 audited resurrections, got ${beforeAudit.totalAudited}`);
    }

    // Run Compaction (forget history older than 90 days)
    forgettingPreservator.forgetStaleHistory(90 * 24 * 3600 * 1000);

    // After compaction metrics
    const afterAudit = forgettingPreservator.auditResurrectionPredictions();
    console.log(`     - After Compaction: totalResurrections=${afterAudit.totalAudited}`);
    if (afterAudit.totalAudited !== 2) {
        throw new Error(`Expected total audited resurrections count to remain 2, got ${afterAudit.totalAudited}`);
    }
    
    // Verify specific operator details have been deleted
    const bobScore = afterAudit.operatorAccuracyScores['SreBob'];
    console.log(`     - SreBob Active Forecasts Count: ${bobScore ? bobScore.totalResurrections : 0}`);
    if (bobScore && bobScore.totalResurrections !== 1) {
        throw new Error('Failed to forget stale individual history detail logs!');
    }

    console.log('  ✅ Decay-by-Default & Institutional Compaction verified.\n');

    console.log('================================================================================');
    console.log('🎉  ALL ZTAN PHASE 25 HARDENING VERIFICATION DRILLS COMPLETED SUCCESSFULLY!');
    console.log('================================================================================');
}

runPhase25Verification().catch(err => {
    console.error('\n❌  VERIFICATION FAILURE DETECTED:');
    console.error(err);
    process.exit(1);
});
