import { describe, it, expect } from 'vitest';
import { CommandSemanticParser } from '../../src/ontology/parser.js';
import { PermissionEngine } from '../../src/permissions/lattice.js';
import { StaticCommandFilter } from '../../src/filters/command-filter.js';

describe('Phase F1: Ontology Surface Expansion & Semantic Parsing Tests', () => {
    it('should parse individual command tokens to correct ontology operations', () => {
        expect(CommandSemanticParser.parseCommand('cat file.txt')).toContain('read-file');
        expect(CommandSemanticParser.parseCommand('echo test > out.txt')).toContain('write-file');
        expect(CommandSemanticParser.parseCommand('rm file.txt')).toContain('delete-file');
        expect(CommandSemanticParser.parseCommand('curl http://test.com')).toContain('socket-connect');
        expect(CommandSemanticParser.parseCommand('listen -p 8080')).toContain('socket-listen');
        expect(CommandSemanticParser.parseCommand('dig google.com')).toContain('dns-resolve');
        expect(CommandSemanticParser.parseCommand('bash script.sh')).toContain('exec-command');
        expect(CommandSemanticParser.parseCommand('reboot')).toContain('reboot-system');
        expect(CommandSemanticParser.parseCommand('mount -t ext4 /dev/sdb /mnt')).toContain('mount-filesystem');
        expect(CommandSemanticParser.parseCommand('some-random-unknown-command')).toContain('spawn-process');
    });

    it('should extract multiple matching operations from piped or chained commands', () => {
        const ops = CommandSemanticParser.parseCommand('cat input.log | grep error >> output.log');
        expect(ops).toContain('read-file');
        expect(ops).toContain('write-file');
    });

    it('should enforce default-deny for parsed operations lacking lattice authorization', async () => {
        // Register lattice for tenant-b allowing only read-file
        PermissionEngine.registerLattice({
            toolName: 'read-file',
            tenantScope: ['tenant-b'],
            filesystemScope: ['*'],
            networkScope: [],
            runtimeMode: 'sandbox',
            approvalRequirement: false,
            payloadLimits: { maxSizeBytes: 1000 },
            executionTimeLimitsMs: 1000,
            allowedFileTypes: ['*'],
            environmentBoundaries: []
        });

        // Proposal containing cat is allowed because read-file is authorized
        const proposalSafe = {
            toolName: 'read-file',
            tenantId: 'tenant-b',
            payload: 'cat /var/log/syslog'
        };
        expect(await StaticCommandFilter.evaluateProposal(proposalSafe)).toBe(true);

        // Proposal containing cat and reboot should fail-closed because reboot-system operation is not authorized
        const proposalUnsafe = {
            toolName: 'read-file',
            tenantId: 'tenant-b',
            payload: 'cat /var/log/syslog && reboot'
        };
        expect(await StaticCommandFilter.evaluateProposal(proposalUnsafe)).toBe(false);
    });
});
