import { describe, it, expect } from 'vitest';
import { NamespaceEscapeDetector } from '../../src/isolation/namespace.js';

describe('Phase E4: Namespace Escape & Containment Breakout Tests', () => {
    it('should identify banned namespace escape commands', () => {
        // Safe commands
        expect(NamespaceEscapeDetector.detectCommandEscapeAttempt('ls -la /var/lib/ztan')).toBe(false);
        expect(NamespaceEscapeDetector.detectCommandEscapeAttempt('echo "hello world"')).toBe(false);

        // Escape commands
        expect(NamespaceEscapeDetector.detectCommandEscapeAttempt('nsenter --target 1 --mount --net --pid -- ipc --uts')).toBe(true);
        expect(NamespaceEscapeDetector.detectCommandEscapeAttempt('unshare -mru /bin/sh')).toBe(true);
        expect(NamespaceEscapeDetector.detectCommandEscapeAttempt('mount --bind / /host')).toBe(true);
        expect(NamespaceEscapeDetector.detectCommandEscapeAttempt('chroot /host /bin/sh')).toBe(true);
    });

    it('should block drive configs mounting outside the designated ZTAN base path', () => {
        // Safe paths
        expect(NamespaceEscapeDetector.detectPathEscapeAttempt('/var/lib/ztan/rootfs/vm-1.ext4')).toBe(false);
        expect(NamespaceEscapeDetector.detectPathEscapeAttempt('/var/lib/ztan/kernels/vmlinux')).toBe(false);

        // Unsafe escape paths
        expect(NamespaceEscapeDetector.detectPathEscapeAttempt('/etc/shadow')).toBe(true);
        expect(NamespaceEscapeDetector.detectPathEscapeAttempt('/root/.ssh/id_rsa')).toBe(true);
        expect(NamespaceEscapeDetector.detectPathEscapeAttempt('/var/log/audit/')).toBe(true);
    });
});
