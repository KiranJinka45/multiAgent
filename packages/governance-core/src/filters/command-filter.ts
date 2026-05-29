import { PermissionEngine } from '../permissions/lattice.js';
import { CommandSemanticParser } from '../ontology/parser.js';
import { GovernanceLedger } from '../ledger/ledger.js';
import * as crypto from 'crypto';

export interface CommandExecutionProposal {
    toolName: string;
    tenantId: string;
    payload: string;
    networkHost?: string;
    filePath?: string;
    readonly LAYER_1_AUTHORITY?: 'PROPOSAL_ONLY';
    id?: string;
    dependencies?: string[];
}

export class StaticCommandFilter {
    /**
     * Default-deny tool execution gate.
     * Evaluates the proposed execution against the PermissionLattice.
     * @returns True if allowed, false if denied.
     */
    static evaluateProposal(proposal: CommandExecutionProposal): boolean {
        // 1. Evaluate the exact tool using the Permission Engine built in Phase A2
        const isToolAllowed = PermissionEngine.evaluateRequest(
            proposal.toolName,
            proposal.tenantId,
            proposal.networkHost,
            proposal.filePath
        );

        if (!isToolAllowed) {
            this.logGovernanceDenial(proposal, `PermissionLattice Rejection for tool ${proposal.toolName}`);
            return false;
        }

        // 2. Parse payload into semantic ontology operations
        const mappedOps = CommandSemanticParser.parseCommand(proposal.payload);

        // 3. Verify permissions for all mapped operations
        for (const op of mappedOps) {
            if (op === proposal.toolName || op === 'spawn-process' || op === 'opaque-execution') {
                continue;
            }

            const isOpAllowed = PermissionEngine.evaluateRequest(
                op,
                proposal.tenantId,
                proposal.networkHost,
                proposal.filePath
            );

            if (!isOpAllowed) {
                this.logGovernanceDenial(proposal, `PermissionLattice Rejection for mapped operation: ${op}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Commits denied proposals to the immutable GovernanceLedger.
     * Evidence hash is a SHA-256 of (payload + toolName + tenantId + reason)
     * to ensure forensic traceability without storing raw payloads.
     */
    private static logGovernanceDenial(proposal: CommandExecutionProposal, reason: string): void {
        const evidenceHash = crypto.createHash('sha256')
            .update(`${proposal.payload}|${proposal.toolName}|${proposal.tenantId}|${reason}`)
            .digest('hex');

        try {
            GovernanceLedger.append(
                'LATTICE_DENIED',
                proposal.tenantId,
                evidenceHash,
                {
                    toolName: proposal.toolName,
                    reason,
                    deniedAt: new Date().toISOString()
                }
            );
        } catch (ledgerErr) {
            // Ledger write failure must not suppress the denial decision.
            // Fallback to stderr to ensure the event is never silently lost.
            console.error(
                `[COMMAND_FILTER] GovernanceLedger.append() failed for denial of ${proposal.toolName}:`,
                ledgerErr
            );
        }
    }
}

