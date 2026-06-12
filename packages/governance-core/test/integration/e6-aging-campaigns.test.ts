import { describe, it, expect } from 'vitest';

export interface VmLease {
    vmId: string;
    createdAt: number;
    expiresAt: number;
}

export class VmLeaseManager {
    private leases = new Map<string, VmLease>();

    createLease(vmId: string, durationMs: number): void {
        const now = Date.now();
        this.leases.set(vmId, {
            vmId,
            createdAt: now,
            expiresAt: now + durationMs
        });
    }

    hasExpired(vmId: string, currentTime: number): boolean {
        const lease = this.leases.get(vmId);
        if (!lease) return true;
        return currentTime > lease.expiresAt;
    }

    purgeExpired(currentTime: number): number {
        let purged = 0;
        for (const [vmId, lease] of this.leases.entries()) {
            if (currentTime > lease.expiresAt) {
                this.leases.delete(vmId);
                purged++;
            }
        }
        return purged;
    }

    getLeaseCount(): number {
        return this.leases.size;
    }
}

describe('Phase E6: 72h-168h VM Lease Aging & Telemetry Campaigns', () => {
    it('should correctly decay and purge VM leases over 72 hours of simulated time', () => {
        const manager = new VmLeaseManager();
        const leaseDuration = 12 * 60 * 60 * 1000; // 12 hours lease

        manager.createLease('vm-short', leaseDuration);
        manager.createLease('vm-persistent', 120 * 60 * 60 * 1000); // 120 hours lease

        expect(manager.getLeaseCount()).toBe(2);

        // Advance simulated time by 72 hours
        const timeAfter72h = Date.now() + 72 * 60 * 60 * 1000;

        expect(manager.hasExpired('vm-short', timeAfter72h)).toBe(true);
        expect(manager.hasExpired('vm-persistent', timeAfter72h)).toBe(false);

        const purged = manager.purgeExpired(timeAfter72h);
        expect(purged).toBe(1);
        expect(manager.getLeaseCount()).toBe(1);
    });

    it('should completely exhaust and flush all expired leases after 168 hours (7 days)', () => {
        const manager = new VmLeaseManager();
        manager.createLease('vm-1', 24 * 60 * 60 * 1000); // 24h
        manager.createLease('vm-2', 72 * 60 * 60 * 1000); // 72h
        manager.createLease('vm-3', 144 * 60 * 60 * 1000); // 144h

        expect(manager.getLeaseCount()).toBe(3);

        // Advance simulated time by 168 hours
        const timeAfter168h = Date.now() + 168 * 60 * 60 * 1000;

        const purged = manager.purgeExpired(timeAfter168h);
        expect(purged).toBe(3);
        expect(manager.getLeaseCount()).toBe(0);
    });
});
