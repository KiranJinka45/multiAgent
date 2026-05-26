import { PathologyCoordinator, TimeWarpConfig } from './pathology-coordinator.js';

export class TimeWarpPathology {
    private coordinator: PathologyCoordinator;
    private static originalDateNow: typeof Date.now = Date.now;
    private static originalDate: typeof Date = Date;
    private static originalHrtime: typeof process.hrtime.bigint = process.hrtime.bigint;
    private static activeConfig: TimeWarpConfig | null = null;
    private static isIntercepting = false;

    constructor(workspaceRoot: string) {
        this.coordinator = new PathologyCoordinator(workspaceRoot);
    }

    /**
     * Activates synthetic time warp injection.
     */
    public async inject(config: Partial<TimeWarpConfig>): Promise<void> {
        console.log(`[Time Warp Pathology] Injecting time warp config:`, config);

        const active = this.coordinator.getActiveConfig();
        
        const fullConfig: TimeWarpConfig = {
            offsetMs: config.offsetMs ?? 0,
            monotonicOffsetNs: config.monotonicOffsetNs ?? '0',
            timeAcceleration: config.timeAcceleration ?? 1.0,
            isLeapSmearing: config.isLeapSmearing ?? false,
            leapSmearDurationMs: config.leapSmearDurationMs ?? 0,
            leapSmearOffsetMs: config.leapSmearOffsetMs ?? 0,
            frozenTimeMs: config.frozenTimeMs ?? null,
            injectedAtRealMs: Date.now(),
            injectedAtMonoNs: process.hrtime.bigint().toString()
        };

        active.timeWarp = fullConfig;
        this.coordinator.saveConfig(active);

        // Apply monkey-patching in current process
        TimeWarpPathology.applyInterceptor(fullConfig);
    }

    /**
     * Clears all simulated time warp pathologies.
     */
    public async clear(): Promise<void> {
        console.log('[Time Warp Pathology] Clearing all active time warps...');
        const active = this.coordinator.getActiveConfig();
        active.timeWarp = {
            offsetMs: 0,
            monotonicOffsetNs: '0',
            timeAcceleration: 1.0,
            isLeapSmearing: false,
            leapSmearDurationMs: 0,
            leapSmearOffsetMs: 0,
            frozenTimeMs: null
        };
        this.coordinator.saveConfig(active);
        TimeWarpPathology.restoreInterceptor();
    }

    /**
     * Simulates NTP correcting the clock back to reality.
     */
    public async mockNtpCorrection(targetOffsetMs: number = 0): Promise<void> {
        console.log(`[Time Warp Pathology] Mocking NTP correction. Adjusting offset to ${targetOffsetMs}ms.`);
        const active = this.coordinator.getActiveConfig();
        if (active.timeWarp) {
            active.timeWarp.offsetMs = targetOffsetMs;
            // Recalculate injected points to ensure smooth continuity
            active.timeWarp.injectedAtRealMs = Date.now();
            active.timeWarp.injectedAtMonoNs = process.hrtime.bigint().toString();
            this.coordinator.saveConfig(active);
            TimeWarpPathology.applyInterceptor(active.timeWarp);
        }
    }

    /**
     * Bootstraps the time warp interceptor if active config is present.
     * Useful for newly spawned processes.
     */
    public bootstrap(): void {
        const active = this.coordinator.getActiveConfig();
        if (active.timeWarp && (active.timeWarp.offsetMs !== 0 || 
                                active.timeWarp.monotonicOffsetNs !== '0' || 
                                active.timeWarp.timeAcceleration !== 1.0 || 
                                active.timeWarp.isLeapSmearing || 
                                active.timeWarp.frozenTimeMs !== null)) {
            TimeWarpPathology.applyInterceptor(active.timeWarp);
        }
    }

    private static applyInterceptor(config: TimeWarpConfig): void {
        this.activeConfig = config;
        if (this.isIntercepting) return;

        this.isIntercepting = true;

        // Save original functions if not already done
        if (this.originalDateNow === Date.now) {
            this.originalDateNow = Date.now;
            this.originalDate = Date;
            this.originalHrtime = process.hrtime.bigint;
        }

        const self = this;

        // Monkey-patch Date.now
        Date.now = () => {
            if (!self.activeConfig) return self.originalDateNow();
            const config = self.activeConfig;
            
            if (config.frozenTimeMs !== null) {
                return config.frozenTimeMs;
            }

            const realNow = self.originalDateNow();
            const injectedReal = config.injectedAtRealMs ?? realNow;
            const elapsedReal = realNow - injectedReal;
            
            let virtualNow = injectedReal + Math.floor(elapsedReal * config.timeAcceleration);
            virtualNow += config.offsetMs;

            if (config.isLeapSmearing && config.leapSmearDurationMs > 0) {
                if (elapsedReal < config.leapSmearDurationMs) {
                    const progress = elapsedReal / config.leapSmearDurationMs;
                    virtualNow += Math.floor(config.leapSmearOffsetMs * progress);
                } else {
                    virtualNow += config.leapSmearOffsetMs;
                }
            }

            return virtualNow;
        };

        // Monkey-patch Date constructor
        const DateStub = function (this: any, ...args: any[]) {
            if (args.length === 0) {
                return new self.originalDate(Date.now());
            }
            return new (self.originalDate as any)(...args);
        } as any;

        DateStub.now = Date.now;
        DateStub.parse = self.originalDate.parse;
        DateStub.UTC = self.originalDate.UTC;
        DateStub.prototype = self.originalDate.prototype;
        globalThis.Date = DateStub;

        // Monkey-patch process.hrtime.bigint
        process.hrtime.bigint = () => {
            if (!self.activeConfig) return self.originalHrtime();
            const config = self.activeConfig;

            const realMono = self.originalHrtime();
            const injectedMono = BigInt(config.injectedAtMonoNs ?? realMono.toString());
            const elapsedMono = realMono - injectedMono;

            let virtualMono = injectedMono + BigInt(Math.floor(Number(elapsedMono) * config.timeAcceleration));
            virtualMono += BigInt(config.monotonicOffsetNs);

            return virtualMono;
        };
    }

    private static restoreInterceptor(): void {
        if (!this.isIntercepting) return;
        Date.now = this.originalDateNow;
        globalThis.Date = this.originalDate;
        process.hrtime.bigint = this.originalHrtime;
        this.activeConfig = null;
        this.isIntercepting = false;
    }
}
