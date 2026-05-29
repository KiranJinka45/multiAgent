export interface VirtiofsLogEntry {
    timestamp: string;
    syscall: string; // e.g. "lo_lookup", "lo_readlink"
    path: string;
    resolvedInode: number;
    responseStatus: string; // e.g. "OK", "ENOENT", "EPERM"
}

export interface VirtiofsAnalysisResult {
    totalLookups: number;
    traversalEscapes: number;
    quarantineTriggered: boolean;
    escapePaths: string[];
}

export class VirtiofsRaceAnalyzer {
    // Simulated root inode for the jailer chroot
    private static readonly JAILED_ROOT_INODE = 1000;

    static analyzeLogs(logs: VirtiofsLogEntry[]): VirtiofsAnalysisResult {
        let traversalEscapes = 0;
        const escapePaths: string[] = [];

        for (const log of logs) {
            // A directory traversal attempt is typically ".." or absolute path from root
            if (log.path.includes('..') || log.path.startsWith('/')) {
                // If it resolves to an inode less than the jailed root, it means it escaped the chroot
                // Or if it returns OK for an explicit escape attempt
                if (log.resolvedInode > 0 && log.resolvedInode < this.JAILED_ROOT_INODE && log.responseStatus === 'OK') {
                    traversalEscapes++;
                    escapePaths.push(log.path);
                }
            }
        }

        return {
            totalLookups: logs.length,
            traversalEscapes,
            quarantineTriggered: traversalEscapes > 0,
            escapePaths
        };
    }
}
