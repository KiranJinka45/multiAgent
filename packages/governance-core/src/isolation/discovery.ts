import * as fs from 'fs';
import { execSync } from 'child_process';

export interface EnvironmentFeatures {
    platform: string;
    arch: string;
    hasKvm: boolean;
    hasCgroups: boolean;
    hasFirecracker: boolean;
    virtualizationSupported: boolean;
}

export class EnvironmentDiscovery {
    static discover(): EnvironmentFeatures {
        const platform = process.platform;
        const arch = process.arch;
        const hasKvm = platform !== 'win32' && fs.existsSync('/dev/kvm');
        const hasCgroups = platform !== 'win32' && fs.existsSync('/sys/fs/cgroup');
        
        let hasFirecracker = false;
        try {
            const cmd = platform === 'win32' ? 'where firecracker' : 'which firecracker';
            execSync(cmd, { stdio: 'ignore' });
            hasFirecracker = true;
        } catch {
            // ignore
        }

        let virtualizationSupported = false;
        if (platform === 'linux') {
            try {
                const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
                virtualizationSupported = cpuinfo.includes('vmx') || cpuinfo.includes('svm');
            } catch {
                // ignore
            }
        } else if (platform === 'win32') {
            // On Windows, virtualisation is supported by host hardware but KVM is not available.
            virtualizationSupported = true;
        }

        return {
            platform,
            arch,
            hasKvm,
            hasCgroups,
            hasFirecracker,
            virtualizationSupported
        };
    }
}
