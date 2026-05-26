import { TelemetryEvent } from '../chronology/replay-compressor.js';

export interface DecoupledBufferReport {
    bufferSize: number;
    droppedEventsCount: number;
    flushedEventsCount: number;
    failureCount: number;
}

export class EvidencePlaneDecoupler {
    private evidenceBuffer: TelemetryEvent[] = [];
    private maxBufferSize: number;
    private droppedEventsCount = 0;
    private flushedEventsCount = 0;
    private failureCount = 0;
    
    private flushInterval: NodeJS.Timeout | null = null;
    private flushing = false;
    private asyncListeners: Array<(events: TelemetryEvent[]) => Promise<void>> = [];

    constructor(maxBufferSize = 1000) {
        this.maxBufferSize = maxBufferSize;
    }

    /**
     * Non-blocking O(1) synchronous evidence emission into bounded memory buffer.
     * Prevents any runtime overhead or network/storage wait blocks.
     */
    public emitEvidence(event: TelemetryEvent): void {
        if (this.evidenceBuffer.length >= this.maxBufferSize) {
            // Defensive drop policy: drop oldest event to keep buffer bounded
            this.evidenceBuffer.shift();
            this.droppedEventsCount++;
        }
        this.evidenceBuffer.push(event);
    }

    /**
     * Registers an asynchronous listener simulating the Stewardship Plane database / ingestion pipeline.
     */
    public registerAsyncListener(listener: (events: TelemetryEvent[]) => Promise<void>): void {
        this.asyncListeners.push(listener);
    }

    /**
     * Start background non-blocking flusher scheduler.
     */
    public startBackgroundFlusher(intervalMs = 100): void {
        if (this.flushInterval) return;
        
        this.flushInterval = setInterval(async () => {
            await this.flushBuffer();
        }, intervalMs);
    }

    /**
     * Stop background flusher scheduler.
     */
    public stopBackgroundFlusher(): void {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    /**
     * Flushes the buffer asynchronously. Catches all Stewardship Plane exceptions
     * and database crashes, ensuring the Runtime execution remains unaffected.
     */
    public async flushBuffer(): Promise<void> {
        if (this.flushing || this.evidenceBuffer.length === 0) return;
        this.flushing = true;

        const eventsToFlush = [...this.evidenceBuffer];
        // Clear immediately to prevent double-flushing or race issues
        this.evidenceBuffer = [];

        try {
            for (const listener of this.asyncListeners) {
                // Execute listeners asynchronously
                await listener(eventsToFlush);
            }
            this.flushedEventsCount += eventsToFlush.length;
        } catch (err: any) {
            // Catastrophic Stewardship plane failures caught silently!
            this.failureCount++;
            // Re-enqueue events or drop depending on policy, here we log it to prevent memory leaks
            console.log(`[EvidencePlaneDecoupler] Caught silent stewardship crash: "${err.message}". Decoupling successful: Runtime Plane unaffected.`);
        } finally {
            this.flushing = false;
        }
    }

    /**
     * Gets current buffer metrics report.
     */
    public getMetricsReport(): DecoupledBufferReport {
        return {
            bufferSize: this.evidenceBuffer.length,
            droppedEventsCount: this.droppedEventsCount,
            flushedEventsCount: this.flushedEventsCount,
            failureCount: this.failureCount
        };
    }
}
