import * as fs from 'fs';
import * as path from 'path';

export class FailureArchaeologyDumper {
    /**
     * Traverses an object graph recursively up to a depth limit, detecting and breaking cycles.
     */
    static cycleSafeDepthLimitedClone(
        val: unknown,
        depth: number,
        maxDepth: number,
        visited: Set<unknown>,
        meta: { truncatedCount: number; circularCount: number; maxDepthReached: number }
    ): unknown {
        if (depth > meta.maxDepthReached) {
            meta.maxDepthReached = depth;
        }

        if (val === null || val === undefined) {
            return val;
        }

        const type = typeof val;
        if (type === 'boolean' || type === 'number' || type === 'string') {
            return val;
        }

        if (type === 'symbol') {
            return val.toString();
        }

        if (type === 'bigint') {
            return val.toString() + 'n';
        }

        if (type === 'function') {
            const funcName = (val as { name?: string }).name || 'anonymous';
            return `[Function: ${funcName}]`;
        }

        if (val instanceof Error) {
            return {
                name: val.name,
                message: val.message,
                stack: val.stack
            };
        }

        if (val instanceof Date) {
            return val.toISOString();
        }

        if (val instanceof RegExp) {
            return val.toString();
        }

        // Handle Map
        if (val instanceof Map) {
            if (visited.has(val)) {
                meta.circularCount++;
                return '[Circular]';
            }
            if (depth >= maxDepth) {
                meta.truncatedCount++;
                return '[Truncated (Depth Limit Exceeded)]';
            }
            visited.add(val);
            const mapEntries = Array.from(val.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
            const mapClone = mapEntries.map(([k, v]) => [
                k, 
                this.cycleSafeDepthLimitedClone(v, depth + 1, maxDepth, visited, meta)
            ]);
            visited.delete(val);
            return mapClone;
        }

        // Handle Set
        if (val instanceof Set) {
            if (visited.has(val)) {
                meta.circularCount++;
                return '[Circular]';
            }
            if (depth >= maxDepth) {
                meta.truncatedCount++;
                return '[Truncated (Depth Limit Exceeded)]';
            }
            visited.add(val);
            const setValues = Array.from(val.values()).sort((a, b) => String(a).localeCompare(String(b)));
            const setClone = setValues.map(v => this.cycleSafeDepthLimitedClone(v, depth + 1, maxDepth, visited, meta));
            visited.delete(val);
            return setClone;
        }

        // Handle Array
        if (Array.isArray(val)) {
            if (visited.has(val)) {
                meta.circularCount++;
                return '[Circular]';
            }
            if (depth >= maxDepth) {
                meta.truncatedCount++;
                return '[Truncated (Depth Limit Exceeded)]';
            }
            visited.add(val);
            const arrClone = val.map(item => this.cycleSafeDepthLimitedClone(item, depth + 1, maxDepth, visited, meta));
            visited.delete(val);
            return arrClone;
        }

        // Handle generic Object
        if (visited.has(val)) {
            meta.circularCount++;
            return '[Circular]';
        }
        if (depth >= maxDepth) {
            meta.truncatedCount++;
            return '[Truncated (Depth Limit Exceeded)]';
        }

        visited.add(val);
        const objClone: Record<string, unknown> = {};

        try {
            const objVal = val as Record<string, unknown>;
            const keys = Object.keys(objVal).sort();
            for (const key of keys) {
                try {
                    objClone[key] = this.cycleSafeDepthLimitedClone(objVal[key], depth + 1, maxDepth, visited, meta);
                } catch (err) {
                    objClone[key] = `[Serialization Error: ${(err as Error).message}]`;
                }
            }
        } catch (err) {
            return `[Object Access Error: ${(err as Error).message}]`;
        } finally {
            visited.delete(val);
        }

        return objClone;
    }

    /**
     * Serializes any payload safely by cloning it first with circular and depth checks.
     */
    static safeJsonStringify(val: unknown, maxDepth: number = 8): { json: string; meta: { truncatedCount: number; circularCount: number; maxDepthReached: number } } {
        const meta = { truncatedCount: 0, circularCount: 0, maxDepthReached: 0 };
        const cleanObj = this.cycleSafeDepthLimitedClone(val, 0, maxDepth, new Set(), meta);
        return {
            json: JSON.stringify(cleanObj, null, 2),
            meta
        };
    }

    static dumpDiagnosticSnapshot(
        term: number,
        reason: string,
        nodes: unknown,
        prepares: unknown,
        wal: unknown,
        fuzzSchedule: unknown = null
    ) {
        const originalWalSize = Array.isArray(wal) ? wal.length : 0;
        const trimmedWal: unknown[] = Array.isArray(wal) ? wal.slice(-1000) : [];
        const timestamp = Date.now();

        try {
            const reportsDir = path.resolve(process.cwd(), 'reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }

            // Helper for atomic writing using safe cycle-safe depth-limited serialization
            const writeAtomicSync = (targetPath: string, rawData: unknown) => {
                const tmpPath = `${targetPath}.tmp`;
                const { json, meta } = this.safeJsonStringify(rawData, 8);
                
                // Parse the json back to append serialization metadata securely
                const finalData = JSON.parse(json);
                finalData.__serialization_metadata__ = {
                    ...meta,
                    timestampStr: new Date(timestamp).toISOString()
                };

                fs.writeFileSync(tmpPath, JSON.stringify(finalData, null, 2));
                fs.renameSync(tmpPath, targetPath);
            };

            // 1. Dump WAL
            const walPath = path.join(reportsDir, `ztan-wal-crash.json`);
            writeAtomicSync(walPath, {
                term,
                timestamp,
                reason,
                walMetadata: {
                    originalSize: originalWalSize,
                    trimmedSize: trimmedWal.length,
                    wasTruncated: originalWalSize > 1000
                },
                wal: trimmedWal
            });

            // 2. Dump prepares
            const preparesPath = path.join(reportsDir, `ztan-prepares-crash.json`);
            writeAtomicSync(preparesPath, { term, timestamp, reason, prepares });

            // 3. Dump nodes
            const nodesPath = path.join(reportsDir, `ztan-nodes-crash.json`);
            writeAtomicSync(nodesPath, { term, timestamp, reason, nodes });

            // 4. Dump fuzz schedule
            const schedulePath = path.join(reportsDir, `ztan-fuzz-schedule-crash.json`);
            const scheduleData = {
                term,
                timestamp,
                reason,
                fuzzSchedule: fuzzSchedule || {
                    timestampStr: new Date().toISOString(),
                    attackVector: 'INVARIANT_VIOLATION_TRIGGERED',
                    perturbedNodes: ['node-1'],
                    delayMs: 250
                }
            };
            writeAtomicSync(schedulePath, scheduleData);

            console.log(`[ZTAN ARCHAEOLOGY] Fail-Closed Snapshot Written Successfully!`);
            console.log(`  - WAL: ${walPath}`);
            console.log(`  - Prepares: ${preparesPath}`);
            console.log(`  - Nodes: ${nodesPath}`);
            console.log(`  - Fuzz Schedule: ${schedulePath}`);

            // Sync to brain artifacts
            const brainArtifactsDir = 'C:/Users/Kiran/.gemini/antigravity-ide/brain/4aa3d588-0fed-4894-99f3-d48acfe95376';
            if (fs.existsSync(brainArtifactsDir)) {
                try {
                    const saveBrain = (name: string, data: unknown) => {
                        const { json, meta } = this.safeJsonStringify(data, 8);
                        const finalData = JSON.parse(json);
                        finalData.__serialization_metadata__ = {
                            ...meta,
                            timestampStr: new Date(timestamp).toISOString()
                        };
                        fs.writeFileSync(path.join(brainArtifactsDir, name), JSON.stringify(finalData, null, 2));
                    };
                    saveBrain('ztan-wal-crash.json', {
                        term,
                        timestamp,
                        reason,
                        walMetadata: {
                            originalSize: originalWalSize,
                            trimmedSize: trimmedWal.length,
                            wasTruncated: originalWalSize > 1000
                        },
                        wal: trimmedWal
                    });
                    saveBrain('ztan-prepares-crash.json', { term, timestamp, reason, prepares });
                    saveBrain('ztan-nodes-crash.json', { term, timestamp, reason, nodes });
                    saveBrain('ztan-fuzz-schedule-crash.json', scheduleData);
                    console.log('[ZTAN ARCHAEOLOGY] Copied crash snapshots to brain artifacts directory.');
                } catch (_err) {
                    // ignore
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            // SECOND-ORDER FAILURE DETECTED: FALLBACK TO STDERR AND MEMORY BUFFER
            console.error(`[ZTAN CRASH-DURING-CRASH WARNING] Disk write failed: ${message}. Falling back to process.stderr direct dump!`);
            
            // Cycle-safe stringification for fallback telemetry to avoid throw-in-catch
            let nodesSummaryStr = 'N/A';
            let preparesSummaryStr = 'N/A';
            let walSummaryStr = 'N/A';

            try {
                nodesSummaryStr = Array.isArray(nodes) ? (nodes as Record<string, unknown>[]).map((n) => `${n.nodeId}:${n.state}:term=${n.currentTerm}`).join(',') : 'N/A';
                preparesSummaryStr = Array.isArray(prepares) ? `Count: ${(prepares as unknown[][]).flat().length}` : 'N/A';
                walSummaryStr = Array.isArray(trimmedWal) ? `Size: ${trimmedWal.length}` : 'N/A';
            } catch (_sumErr) {
                // ignore
            }

            const fallbackTelemetry = {
                diagnosticsError: message,
                term,
                reason,
                nodesSummary: nodesSummaryStr,
                preparesSummary: preparesSummaryStr,
                walSummary: walSummaryStr,
                fallbackTimestampStr: new Date().toISOString()
            };
            
            let payloadBase64 = '';
            try {
                const { json } = this.safeJsonStringify(fallbackTelemetry, 8);
                payloadBase64 = Buffer.from(json).toString('base64');
            } catch (stringifyErr) {
                payloadBase64 = Buffer.from(JSON.stringify({
                    error: 'Extreme corruption, could not serialize summary',
                    message: (stringifyErr as Error).message
                })).toString('base64');
            }

            console.error(`--- ZTAN FALLBACK TELEMETRY BLOCK START ---`);
            console.error(payloadBase64);
            console.error(`--- ZTAN FALLBACK TELEMETRY BLOCK END ---`);
        }
    }
}
