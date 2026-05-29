import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SeccompFilterGenerator, SyscallAuditor } from '../../src/isolation/seccomp.js';

vi.mock('fs', () => {
    return {
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
    };
});

describe('Phase E3: Seccomp Profile Confinement & Audit Tests', () => {
    it('should generate valid seccomp filters mapping blocked syscalls to kill action', () => {
        const filter = SeccompFilterGenerator.generateProfile(['socket', 'connect']);
        expect(filter.default_action).toBe('kill');
        expect(filter.filter_action).toBe('allow');
        expect(filter.syscalls).toEqual([
            { name: 'socket', action: 'allow' },
            { name: 'connect', action: 'allow' }
        ]);
    });

    it('should write seccomp profile to file path successfully', () => {
        const targetPath = path.normalize('/tmp/seccomp/filter.json');
        const targetDir = path.dirname(targetPath);

        try {
            SeccompFilterGenerator.writeProfileToFile(targetPath, ['reboot']);
            expect(fs.mkdirSync).toHaveBeenCalledWith(targetDir, { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                targetPath,
                expect.stringContaining('"name": "reboot"')
            );
        } finally {
            vi.mocked(fs.mkdirSync).mockClear();
            vi.mocked(fs.writeFileSync).mockClear();
        }
    });

    it('should audit and identify blocked syscall violation events from logs', () => {
        const auditor = new SyscallAuditor();
        auditor.auditLog('some random harmless log line');
        expect(auditor.getViolations().length).toBe(0);

        // Syscall 41 (socket) audit violation
        auditor.auditLog('type=SECCOMP msg=audit(1620000000.123:456): arch=c000003e syscall=41 compat=0 ip=0x7f83a ip=0x0 code=0x80000000');
        expect(auditor.getViolations().length).toBe(1);
        expect(auditor.getViolations()[0]).toContain('socket');
        expect(auditor.getViolations()[0]).toContain('number 41');

        // Syscall 169 (reboot) audit violation
        auditor.auditLog('type=SECCOMP msg=audit(1620000000.125:457): arch=c000003e syscall=169 compat=0 ip=0x7f83a ip=0x0 code=0x80000000');
        expect(auditor.getViolations().length).toBe(2);
        expect(auditor.getViolations()[1]).toContain('reboot');
        expect(auditor.getViolations()[1]).toContain('number 169');
    });
});
