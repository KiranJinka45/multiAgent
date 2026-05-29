import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface ContainerConfig {
    image: string;
    command: string[];
    memoryLimitMb: number;
    pidsLimit: number;
    dropAllCaps: boolean;
    readOnlyRootfs: boolean;
}

export class ContainerOrchestrator {
    /**
     * Executes a payload inside a strictly constrained Docker container,
     * enforcing namespaces, cgroups, capabilities, and custom seccomp-bpf filters.
     * This replaces the pure user-space orchestration mock.
     */
    static runIsolated(config: ContainerConfig): { success: boolean; output: string; error?: string } {
        const containerName = `ztan-sandbox-${randomUUID()}`;
        
        let dockerCmd = `docker run --rm --name ${containerName}`;

        // Enforce cgroup v2 memory & PID limits
        dockerCmd += ` --memory=${config.memoryLimitMb}m`;
        dockerCmd += ` --pids-limit=${config.pidsLimit}`;

        // Enforce Namespace and Capability isolation
        if (config.dropAllCaps) {
            dockerCmd += ` --cap-drop=ALL`;
            dockerCmd += ` --security-opt=no-new-privileges:true`;
        }

        // Apply custom seccomp-bpf profile to block eBPF and filesystem escapes
        const seccompPath = path.resolve(process.cwd(), 'reports', 'ztan-seccomp.json');
        try {
            if (!fs.existsSync(path.dirname(seccompPath))) {
                fs.mkdirSync(path.dirname(seccompPath), { recursive: true });
            }
            const seccompProfile = {
                defaultAction: "SCMP_ACT_ALLOW",
                architectures: [
                    "SCMP_ARCH_X86_64",
                    "SCMP_ARCH_X86",
                    "SCMP_ARCH_X32"
                ],
                syscalls: [
                    {
                        names: ["bpf", "mount", "pivot_root", "syslog", "keyctl"],
                        action: "SCMP_ACT_ERRNO",
                        args: []
                    }
                ]
            };
            fs.writeFileSync(seccompPath, JSON.stringify(seccompProfile, null, 2));
            
            // Normalize path separators to forward slashes for WSL2/Docker Windows daemon compatibility
            const normalizedPath = seccompPath.replace(/\\/g, '/');
            dockerCmd += ` --security-opt seccomp=${normalizedPath}`;
        } catch (e: any) {
            console.warn(`[ZTAN CONTAINER] Could not write custom seccomp profile: ${e.message}`);
        }

        // Mount protections
        if (config.readOnlyRootfs) {
            dockerCmd += ` --read-only --tmpfs /tmp`;
        }

        const formattedCmd = config.command.map(arg => arg.includes(' ') ? `"${arg.replace(/"/g, '\\"')}"` : arg).join(' ');
        dockerCmd += ` ${config.image} ${formattedCmd}`;

        try {
            const output = execSync(dockerCmd, { stdio: 'pipe', encoding: 'utf8' });
            return { success: true, output };
        } catch (err: any) {
            return { 
                success: false, 
                output: err.stdout || '',
                error: err.stderr || err.message
            };
        }
    }
}
