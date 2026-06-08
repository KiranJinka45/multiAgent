import { FailureArchaeologyDumper } from '../src/ledger/archaeology-dumper.js';
import * as fs from 'fs';
import * as path from 'path';

console.log('==================================================');
console.log('🧨 RUNNING CAMPAIGN U: DUMPER SELF-FALSIFICATION');
console.log('==================================================\n');

async function main() {
    let successCount = 0;
    const totalScenarios = 4;

    // -------------------------------------------------------------------------
    // SCENARIO 1: Second-Order Filesystem Exception Fallback to stderr
    // -------------------------------------------------------------------------
    console.log('SCENARIO 1: Testing Second-Order Filesystem Exception Fallback...');
    const originalCwd = process.cwd;
    process.cwd = () => 'Q:\\non-existent-drive-letter\\ztan-sandbox-forbidden';

    const stderrLines: string[] = [];
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = (chunk: string | Uint8Array, _encoding?: string, _cb?: (err?: Error) => void) => {
        stderrLines.push(chunk.toString());
        return true;
    };

    try {
        FailureArchaeologyDumper.dumpDiagnosticSnapshot(
            2,
            'ZTAN_INVARIANT_VIOLATION: QUORUM_INTERSECTION_BROKEN',
            [{ nodeId: 'node-1', state: 2, currentTerm: 2 }],
            [[{ nodeId: 'node-1', term: 2, merkleRoot: 'ROOT_A', signature: '' }]],
            [{ term: 2, command: 'TX_01' }]
        );
    } finally {
        process.cwd = originalCwd;
        process.stderr.write = originalStderrWrite;
    }

    const fullStderrText = stderrLines.join('');
    const hasWarning = fullStderrText.includes('CRASH-DURING-CRASH WARNING');
    const hasTelemetryBlock = fullStderrText.includes('FALLBACK TELEMETRY BLOCK START');
    
    if (hasWarning && hasTelemetryBlock) {
        console.log('  🛡️ SCENARIO 1 PASS: Graceful fallback to base64 stderr telemetry verified.');
        successCount++;
    } else {
        console.error('  💥 SCENARIO 1 FAIL: Fallback failed to trigger correctly.');
    }

    // -------------------------------------------------------------------------
    // SCENARIO 2: Poisoned Circular Object Graph Serialization
    // -------------------------------------------------------------------------
    console.log('\nSCENARIO 2: Testing Circular Object Graph Poisoning...');
    
    // Construct a circular structure
    const circularNode: Record<string, unknown> = { nodeId: 'node-poisoned', state: 'BYZANTINE' };
    circularNode.self = circularNode; // direct circle
    
    const siblingNode: Record<string, unknown> = { nodeId: 'node-sibling' };
    circularNode.sibling = siblingNode;
    siblingNode.circularRef = circularNode; // indirect circle

    const testPayload = [circularNode];

    try {
        const { json, meta } = FailureArchaeologyDumper.safeJsonStringify(testPayload, 8);
        const parsed = JSON.parse(json);
        
        const hasCircularMarker = parsed[0].self === '[Circular]' && parsed[0].sibling.circularRef === '[Circular]';
        const hasCircularCount = meta.circularCount > 0;

        if (hasCircularMarker && hasCircularCount) {
            console.log(`  🛡️ SCENARIO 2 PASS: Circular references intercepted and neutralized (circularCount: ${meta.circularCount}).`);
            successCount++;
        } else {
            console.error('  💥 SCENARIO 2 FAIL: Circular reference not correctly indicated or counted.', { hasCircularMarker, hasCircularCount });
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? (err as Error).message : String(err);
        console.error(`  💥 SCENARIO 2 FAIL: Serializer threw exception on circular graph: ${message}`);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 3: Pathological Runaway Depth Structures (Max Depth = 8)
    // -------------------------------------------------------------------------
    console.log('\nSCENARIO 3: Testing Pathological Runaway Depth Structure...');
    
    // Construct a structure nested 15 layers deep
    const constructDeepObject = (currentDepth: number, max: number): unknown => {
        if (currentDepth >= max) {
            return { leaf: 'bottom' };
        }
        return {
            depth: currentDepth,
            child: constructDeepObject(currentDepth + 1, max)
        };
    };
    
    const runawayDeepObject = constructDeepObject(0, 15);

    try {
        const { json, meta } = FailureArchaeologyDumper.safeJsonStringify(runawayDeepObject, 8);
        const parsed = JSON.parse(json);

        // Verify truncation at maxDepth = 8
        let current = parsed;
        
        for (let i = 0; i < 8; i++) {
            current = current.child;
        }
        
        if (current === '[Truncated (Depth Limit Exceeded)]' && meta.truncatedCount > 0) {
            console.log(`  🛡️ SCENARIO 3 PASS: Deep object safely truncated at depth 8 (truncatedCount: ${meta.truncatedCount}, maxDepthReached: ${meta.maxDepthReached}).`);
            successCount++;
        } else {
            console.error('  💥 SCENARIO 3 FAIL: Deep object was not truncated at depth 8 correctly.', { depth8Val: current, meta });
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? (err as Error).message : String(err);
        console.error(`  💥 SCENARIO 3 FAIL: Serializer threw exception on deep object: ${message}`);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 4: Corrupted Unicode Payload Handling
    // -------------------------------------------------------------------------
    console.log('\nSCENARIO 4: Testing Corrupted Unicode Payload Handling...');
    
    // Injected string contains malformed surrogate pairs and special chars
    const corruptedUnicodeString = 'ZTAN_\uD800_CORRUPT_\uDF06_TEST_\uFFFD';
    const payloadWithCorruptUnicode = {
        reason: corruptedUnicodeString,
        data: 'safe_data'
    };

    try {
        const { json } = FailureArchaeologyDumper.safeJsonStringify(payloadWithCorruptUnicode, 8);
        const parsed = JSON.parse(json);
        
        if (parsed.reason.includes('ZTAN_') && parsed.data === 'safe_data') {
            console.log('  🛡️ SCENARIO 4 PASS: Corrupted Unicode handled cleanly and serialized without faults.');
            successCount++;
        } else {
            console.error('  💥 SCENARIO 4 FAIL: Output content did not match expected structure.');
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? (err as Error).message : String(err);
        console.error(`  💥 SCENARIO 4 FAIL: Serializer crashed on corrupted Unicode payload: ${message}`);
    }

    // -------------------------------------------------------------------------
    // SUMMARY ASSESSMENT
    // -------------------------------------------------------------------------
    console.log('\n==================================================');
    console.log(`CAMPAIGN U RESULTS: ${successCount} / ${totalScenarios} Modeled Vectors Successfully Audited`);
    console.log('==================================================\n');

    if (successCount === totalScenarios) {
        console.log('🛡️ ALL FALSIFICATION CAMPAIGNS PASSED: DUMPER IS EXTREMELY RESILIENT!');
        console.log('Observed successful bypasses: 0 / 4 modeled vectors');
        console.log('==================================================\n');
    } else {
        console.error('💥 FALSIFICATION AUDIT FAILED!');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Dumper falsification runner encountered runtime error:', err);
    process.exit(1);
});
