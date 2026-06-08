import { describe, it, expect, vi } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import { ResourceArchaeologist } from '../../src/isolation/archaeology.js';

vi.mock('os', async (importOriginal) => {
    const original = await importOriginal<typeof import('os')>();
    return {
        ...original,
        totalmem: vi.fn(() => original.totalmem()),
        freemem: vi.fn(() => original.freemem()),
    };
});

vi.mock('fs', async (importOriginal) => {
    const original = await importOriginal<typeof import('fs')>();
    return {
        ...original,
        existsSync: vi.fn((path) => original.existsSync(path)),
        statfsSync: vi.fn((path) => original.statfsSync(path)),
    };
});

describe('Phase I1: Resource-Exhaustion Archaeology & Failure Diagnostics Tests', () => {
    it('should capture a well-formed system resource snapshot containing memory metrics', () => {
        const snapshot = ResourceArchaeologist.takeSnapshot();
        expect(snapshot).toHaveProperty('freeMemoryBytes');
        expect(snapshot).toHaveProperty('totalMemoryBytes');
        expect(snapshot).toHaveProperty('memoryPressure');
        expect(snapshot).toHaveProperty('degraded');
        expect(typeof snapshot.degraded).toBe('boolean');
    });

    it('should flag degradation when memory pressure exceeds 95%', () => {
        vi.mocked(os.totalmem).mockReturnValue(1000000000); // 1GB
        vi.mocked(os.freemem).mockReturnValue(40000000);   // 40MB free -> 96% pressure

        try {
            const snapshot = ResourceArchaeologist.takeSnapshot();
            expect(snapshot.memoryPressure).toBe(0.96);
            expect(snapshot.degraded).toBe(true);
            expect(snapshot.reason).toBe('CRITICAL_MEMORY_EXHAUSTION');
        } finally {
            vi.mocked(os.totalmem).mockRestore();
            vi.mocked(os.freemem).mockRestore();
        }
    });

    it('should flag degradation when disk free space is below 50MB', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.statfsSync).mockReturnValue({
            bsize: 4096,
            bfree: 1000, // 4096 * 1000 = ~4MB free
            bavail: 1000,
            blocks: 1000000,
            ffree: 100000,
            files: 1000000,
            type: 0
        } as unknown as fs.StatsFs);

        vi.mocked(os.totalmem).mockReturnValue(1000000000);
        vi.mocked(os.freemem).mockReturnValue(500000000); // 50% memory pressure

        try {
            const snapshot = ResourceArchaeologist.takeSnapshot('/var/lib/ztan');
            expect(snapshot.degraded).toBe(true);
            expect(snapshot.reason).toBe('CRITICAL_DISK_EXHAUSTION');
        } finally {
            vi.mocked(fs.existsSync).mockRestore();
            vi.mocked(fs.statfsSync).mockRestore();
            vi.mocked(os.totalmem).mockRestore();
            vi.mocked(os.freemem).mockRestore();
        }
    });
});
