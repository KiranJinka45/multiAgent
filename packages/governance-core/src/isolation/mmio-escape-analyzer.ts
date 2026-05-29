export interface MmioTraceEntry {
    timestamp: string;
    eventType: string; // e.g. "KVM_EXIT_MMIO", "PAGE_FAULT"
    address: string; // e.g. "0x00000000FC000000"
    operation: "READ" | "WRITE";
    size: number;
}

export interface MmioAnalysisResult {
    totalTraces: number;
    illegalCrossings: number;
    quarantineTriggered: boolean;
    violatingAddresses: string[];
}

export class MmioEscapeAnalyzer {
    // Standard Firecracker MMIO device regions map approximately to high 32-bit addresses
    // We'll define a strict legitimate bounded region for testing:
    private static readonly VALID_MMIO_START = BigInt("0x00000000D0000000");
    private static readonly VALID_MMIO_END   = BigInt("0x00000000FFFFFFFF");

    static analyzeTraces(traces: MmioTraceEntry[]): MmioAnalysisResult {
        let illegalCrossings = 0;
        const violatingAddresses: string[] = [];

        for (const trace of traces) {
            if (trace.eventType === 'KVM_EXIT_MMIO' || trace.eventType === 'PAGE_FAULT') {
                try {
                    const addr = BigInt(trace.address);
                    if (addr < this.VALID_MMIO_START || addr > this.VALID_MMIO_END) {
                        illegalCrossings++;
                        violatingAddresses.push(trace.address);
                    }
                } catch {
                    // Invalid address format treated as violation
                    illegalCrossings++;
                    violatingAddresses.push(trace.address);
                }
            }
        }

        return {
            totalTraces: traces.length,
            illegalCrossings,
            quarantineTriggered: illegalCrossings > 0,
            violatingAddresses
        };
    }
}
