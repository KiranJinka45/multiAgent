import * as fs from 'fs';
import * as path from 'path';

export interface SeccompFilter {
    default_action: string;
    filter_action: string;
    syscalls: Array<{
        name: string;
        action: string;
        args?: unknown[];
    }>;
}

/**
 * SECURITY POSTURE: Default-KILL with explicit allowlist.
 *
 * Only the minimal set of syscalls required for Firecracker microVM guest
 * operation are permitted. Everything else is killed by the kernel.
 */
export class SeccompFilterGenerator {
    /**
     * Minimal syscall allowlist for a sandboxed Firecracker microVM workload.
     */
    private static readonly DEFAULT_ALLOWLIST: string[] = [
        // Process lifecycle
        'exit', 'exit_group', 'rt_sigreturn',
        // Memory management
        'brk', 'mmap', 'munmap', 'mprotect', 'mremap', 'madvise',
        // File I/O (sandbox-scoped)
        'read', 'write', 'open', 'openat', 'close', 'fstat', 'stat', 'lstat',
        'lseek', 'pread64', 'pwrite64', 'readv', 'writev', 'access', 'faccessat',
        'fcntl', 'dup', 'dup2', 'dup3',
        // Directory operations
        'getdents', 'getdents64', 'getcwd',
        // Process info
        'getpid', 'getppid', 'getuid', 'geteuid', 'getgid', 'getegid',
        // Threading & clone (clone is filtered)
        'clone',
        'gettid', 'set_tid_address', 'set_robust_list',
        // Signals
        'rt_sigaction', 'rt_sigprocmask', 'sigaltstack',
        // Time
        'clock_gettime', 'clock_getres', 'gettimeofday', 'nanosleep',
        // Misc required by libc
        'arch_prctl', 'futex', 'sched_yield', 'getrandom',
        'pipe', 'pipe2', 'poll', 'ppoll', 'epoll_create', 'epoll_create1',
        'epoll_ctl', 'epoll_wait', 'epoll_pwait', 'eventfd', 'eventfd2',
        // Wait
        'wait4', 'waitid',
        // ioctl (limited — needed for terminal handling)
        'ioctl',
    ];

    private static readonly DEFAULT_BLOCKEDLIST: string[] = [
        'ptrace', 'socket', 'connect', 'mount', 'chroot', 'pivot_root', 'reboot'
    ];

    /**
     * Generates a default-kill seccomp profile with an explicit syscall allowlist.
     */
    static generateProfile(allowedSyscalls?: string[]): SeccompFilter {
        const list = allowedSyscalls || this.DEFAULT_ALLOWLIST;
        const syscalls = list
            .filter(name => name !== 'ptrace') // Strictly ensure ptrace is never allowed
            .map(name => {
                if (name === 'clone') {
                    return {
                        name,
                        action: 'allow',
                        args: [
                            {
                                index: 0,
                                op: 'mask_equal',
                                value: 131072, // CLONE_NEWNS flag (0x00020000)
                                negated: true
                            }
                        ]
                    };
                }
                return {
                    name,
                    action: 'allow'
                };
            });

        return {
            default_action: 'kill',
            filter_action: 'allow',
            syscalls
        };
    }

    /**
     * Loads the seccomp profile from a static JSON file. Falls back to generating dynamically on error.
     */
    static loadProfileFromFile(filePath: string): SeccompFilter {
        try {
            const resolvedPath = path.resolve(filePath);
            if (fs.existsSync(resolvedPath)) {
                const data = fs.readFileSync(resolvedPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[SECCOMP] Failed to load static profile from ${filePath}: ${message}`);
        }
        return this.generateProfile();
    }

    /**
     * @deprecated Use generateProfile() with the new allowlist-based approach.
     */
    static generateLegacyBlocklistProfile(
        blockedSyscalls: string[] = SeccompFilterGenerator.DEFAULT_BLOCKEDLIST
    ): SeccompFilter {
        // Ensure ptrace is always blocked in blocklist
        const finalBlocklist = Array.from(new Set([...blockedSyscalls, 'ptrace']));
        return {
            default_action: 'allow',
            filter_action: 'kill',
            syscalls: finalBlocklist.map(name => ({ name, action: 'kill' }))
        };
    }

    static writeProfileToFile(filePath: string, allowedSyscalls?: string[]): void {
        const profile = this.generateProfile(allowedSyscalls);
        try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[SECCOMP] Failed to write profile: ${message}`);
        }
    }
}

export class SyscallAuditor {
    private violations: string[] = [];

    auditLog(logLine: string): void {
        if (logLine.includes('type=SECCOMP') || logLine.includes('audit(')) {
            const match = logLine.match(/syscall=(\d+)/);
            if (match) {
                const syscallNum = match[1];
                const syscallName = this.mapSyscallNumber(parseInt(syscallNum, 10));
                this.violations.push(`Blocked syscall violation: system call ${syscallName} (number ${syscallNum})`);
            }
        }
    }

    getViolations(): string[] {
        return this.violations;
    }

    clear(): void {
        this.violations = [];
    }

    private mapSyscallNumber(num: number): string {
        const mapping: Record<number, string> = {
            41: 'socket',
            42: 'connect',
            49: 'bind',
            50: 'listen',
            43: 'accept',
            44: 'sendto',
            45: 'recvfrom',
            46: 'sendmsg',
            47: 'recvmsg',
            101: 'ptrace',
            165: 'mount',
            166: 'umount2',
            161: 'chroot',
            155: 'pivot_root',
            169: 'reboot',
            56: 'clone',
            57: 'fork',
            58: 'vfork',
            59: 'execve',
            322: 'execveat',
        };
        return mapping[num] || `unknown-${num}`;
    }
}
