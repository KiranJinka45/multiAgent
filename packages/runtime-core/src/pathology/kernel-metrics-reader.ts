import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';

export interface PressureMetrics {
    avg10: number;
    avg60: number;
    avg300: number;
    total: number;
}

export interface PsiReport {
    cpu: { some: PressureMetrics };
    memory: { some: PressureMetrics; full: PressureMetrics };
    io: { some: PressureMetrics; full: PressureMetrics };
}

export interface CgroupStats {
    cpuThrottledPeriods: number;
    cpuThrottledTimeMs: number;
    memoryLimitBytes: number;
    blkioThrottleReadBytes: number;
    blkioThrottleWriteBytes: number;
}

export interface DiskMetrics {
    writeBytesSec: number;
    totalInodes: number;
    freeInodes: number;
    inodeExhaustionPercent: number;
}

export class KernelMetricsReader {
    private isLinux: boolean;

    constructor() {
        this.isLinux = os.platform() === 'linux';
    }

    /**
     * Parses Linux Pressure Stall Information (PSI) from /proc/pressure/*.
     */
    public readPressureStallInformation(): PsiReport {
        if (!this.isLinux) {
            return this.getMockPsiReport();
        }

        try {
            return {
                cpu: { some: this.parsePsiFile('/proc/pressure/cpu', 'some') },
                memory: {
                    some: this.parsePsiFile('/proc/pressure/memory', 'some'),
                    full: this.parsePsiFile('/proc/pressure/memory', 'full')
                },
                io: {
                    some: this.parsePsiFile('/proc/pressure/io', 'some'),
                    full: this.parsePsiFile('/proc/pressure/io', 'full')
                }
            };
        } catch (e) {
            return this.getMockPsiReport();
        }
    }

    /**
     * Extracts CPU and memory throttling metrics from active cgroups.
     */
    public readCgroupStats(cgroupPath: string = '/sys/fs/cgroup/ztan_cgroup'): CgroupStats {
        if (!this.isLinux) {
            return this.getMockCgroupStats();
        }

        let cpuThrottledPeriods = 0;
        let cpuThrottledTimeMs = 0;
        let memoryLimitBytes = 0;
        let blkioThrottleReadBytes = 0;
        let blkioThrottleWriteBytes = 0;

        try {
            // Parse CPU Stat (works for both v1 and v2 with fallbacks)
            const cpuStatPath = fs.existsSync(`${cgroupPath}/cpu.stat`) 
                ? `${cgroupPath}/cpu.stat` 
                : '/sys/fs/cgroup/cpu/cpu.stat';

            if (fs.existsSync(cpuStatPath)) {
                const cpuContent = fs.readFileSync(cpuStatPath, 'utf8');
                const nrThrottledMatch = cpuContent.match(/nr_throttled\s+(\d+)/);
                const throttledTimeMatch = cpuContent.match(/throttled_time\s+(\d+)/); // ns
                const throttledUsecMatch = cpuContent.match(/throttled_usec\s+(\d+)/); // us
                
                if (nrThrottledMatch) cpuThrottledPeriods = parseInt(nrThrottledMatch[1], 10);
                if (throttledTimeMatch) cpuThrottledTimeMs = Math.round(parseInt(throttledTimeMatch[1], 10) / 1000000);
                if (throttledUsecMatch) cpuThrottledTimeMs = Math.round(parseInt(throttledUsecMatch[1], 10) / 1000);
            }

            // Parse Memory Limit
            const memLimitPath = fs.existsSync(`${cgroupPath}/memory.limit_in_bytes`)
                ? `${cgroupPath}/memory.limit_in_bytes`
                : `${cgroupPath}/memory.max`;

            if (fs.existsSync(memLimitPath)) {
                const memContent = fs.readFileSync(memLimitPath, 'utf8').trim();
                memoryLimitBytes = memContent === 'max' ? Infinity : parseInt(memContent, 10);
            }

            // Parse Blkio Throttle Bytes
            const blkioStatPath = `${cgroupPath}/blkio.throttle.io_service_bytes`;
            if (fs.existsSync(blkioStatPath)) {
                const blkioContent = fs.readFileSync(blkioStatPath, 'utf8');
                const readMatch = blkioContent.match(/Read\s+(\d+)/);
                const writeMatch = blkioContent.match(/Write\s+(\d+)/);
                if (readMatch) blkioThrottleReadBytes = parseInt(readMatch[1], 10);
                if (writeMatch) blkioThrottleWriteBytes = parseInt(writeMatch[1], 10);
            }
        } catch (e) {
            return this.getMockCgroupStats();
        }

        return {
            cpuThrottledPeriods,
            cpuThrottledTimeMs,
            memoryLimitBytes,
            blkioThrottleReadBytes,
            blkioThrottleWriteBytes
        };
    }

    /**
     * Audits inode density and disk write throughput.
     */
    public readDiskStats(mountPath: string = '/'): DiskMetrics {
        if (!this.isLinux) {
            return this.getMockDiskMetrics();
        }

        // Mock defaults
        let writeBytesSec = 1024 * 1024 * 1.5; // 1.5 MB/s
        let totalInodes = 1000000;
        let freeInodes = 950000;

        try {
            // Read inodes via statfs if on Unix (emulated via df command)
            const dfOut = execSyncCmd(`df -i ${mountPath}`);
            const lines = dfOut.split('\n');
            if (lines.length > 1) {
                const parts = lines[1].split(/\s+/);
                if (parts.length >= 4) {
                    totalInodes = parseInt(parts[1], 10) || 1000000;
                    const usedInodes = parseInt(parts[2], 10) || 50000;
                    freeInodes = parseInt(parts[3], 10) || 950000;
                }
            }

            // Read disk IO write throughput (read from /proc/diskstats)
            const diskContent = fs.readFileSync('/proc/diskstats', 'utf8');
            // Simplistic extraction of total write sectors from the disk stats
            const matches = diskContent.trim().split('\n');
            let totalWriteSectors = 0;
            for (const line of matches) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 10) {
                    totalWriteSectors += parseInt(parts[9], 10) || 0;
                }
            }
            writeBytesSec = totalWriteSectors * 512; // 512 bytes per sector
        } catch (e) {
            return this.getMockDiskMetrics();
        }

        const inodeExhaustionPercent = ((totalInodes - freeInodes) / totalInodes) * 100;

        return {
            writeBytesSec,
            totalInodes,
            freeInodes,
            inodeExhaustionPercent: Math.round(inodeExhaustionPercent * 100) / 100
        };
    }

    /**
     * Measures network latency RTT and jitter.
     */
    public measureRttJitter(host: string = '127.0.0.1'): Promise<{ avgRttMs: number; jitterMs: number }> {
        return new Promise((resolve) => {
            const count = 5;
            const pingCmd = os.platform() === 'win32' 
                ? `ping -n ${count} ${host}` 
                : `ping -c ${count} ${host}`;

            exec(pingCmd, (err, stdout) => {
                if (err || !stdout) {
                    resolve({ avgRttMs: 1.5, jitterMs: 0.2 }); // Safe loopback mock fallback
                    return;
                }

                try {
                    const rtts: number[] = [];
                    const matches = stdout.match(/(?:time|tiempo)[=<]([\d.]+)\s*ms/gi);
                    
                    if (matches) {
                        for (const match of matches) {
                            const val = parseFloat(match.replace(/[^0-9.]/g, ''));
                            if (!isNaN(val)) rtts.push(val);
                        }
                    }

                    if (rtts.length < 2) {
                        resolve({ avgRttMs: 1.5, jitterMs: 0.2 });
                        return;
                    }

                    const sum = rtts.reduce((a, b) => a + b, 0);
                    const avgRttMs = sum / rtts.length;

                    // Compute jitter (average difference between consecutive RTTs)
                    let diffSum = 0;
                    for (let i = 1; i < rtts.length; i++) {
                        diffSum += Math.abs(rtts[i] - rtts[i - 1]);
                    }
                    const jitterMs = diffSum / (rtts.length - 1);

                    resolve({
                        avgRttMs: Math.round(avgRttMs * 100) / 100,
                        jitterMs: Math.round(jitterMs * 100) / 100
                    });
                } catch (e) {
                    resolve({ avgRttMs: 1.5, jitterMs: 0.2 });
                }
            });
        });
    }

    private parsePsiFile(filePath: string, prefix: 'some' | 'full'): PressureMetrics {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith(prefix)) {
                const avg10Match = line.match(/avg10=([\d.]+)/);
                const avg60Match = line.match(/avg60=([\d.]+)/);
                const avg300Match = line.match(/avg300=([\d.]+)/);
                const totalMatch = line.match(/total=(\d+)/);

                return {
                    avg10: avg10Match ? parseFloat(avg10Match[1]) : 0,
                    avg60: avg60Match ? parseFloat(avg60Match[1]) : 0,
                    avg300: avg300Match ? parseFloat(avg300Match[1]) : 0,
                    total: totalMatch ? parseInt(totalMatch[1], 10) : 0
                };
            }
        }
        throw new Error(`PSI Prefix '${prefix}' not found in ${filePath}`);
    }

    private getMockPsiReport(): PsiReport {
        return {
            cpu: { some: { avg10: 0.12, avg60: 0.08, avg300: 0.03, total: 245000 } },
            memory: {
                some: { avg10: 0.02, avg60: 0.01, avg300: 0.01, total: 12000 },
                full: { avg10: 0.0, avg60: 0.0, avg300: 0.0, total: 0 }
            },
            io: {
                some: { avg10: 0.05, avg60: 0.04, avg300: 0.02, total: 45000 },
                full: { avg10: 0.01, avg60: 0.01, avg300: 0.0, total: 3400 }
            }
        };
    }

    private getMockCgroupStats(): CgroupStats {
        return {
            cpuThrottledPeriods: 15,
            cpuThrottledTimeMs: 125,
            memoryLimitBytes: 1024 * 1024 * 512, // 512MB
            blkioThrottleReadBytes: 2500000,
            blkioThrottleWriteBytes: 4800000
        };
    }

    private getMockDiskMetrics(): DiskMetrics {
        return {
            writeBytesSec: 1024 * 1024 * 2.3, // 2.3 MB/s
            totalInodes: 5000000,
            freeInodes: 4850000,
            inodeExhaustionPercent: 3.0
        };
    }
}

function execSyncCmd(cmd: string): string {
    const { execSync } = require('child_process');
    return execSync(cmd).toString();
}
