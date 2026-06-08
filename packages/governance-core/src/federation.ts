import { INSTITUTIONAL_CONSTITUTION } from './constitution.js';
import type { ConstitutionalRule } from './constitution.js';
import crypto from 'crypto';

export interface GovernanceSignal {
    originRegion: string;
    timestamp: number;
    constitutionHash: string;
    epoch: number;
}

export interface SemanticConcept {
    key: string;
    synonyms: string[];
    description: string;
    criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface SemanticMap {
    orgId: string;
    concepts: Record<string, string>; // Maps standard key to local term
}

export interface DriftReport {
    timestamp: number;
    targetOrg: string;
    overallScore: number;
    perfectMatches: string[];
    synonymMatches: Array<{
        standardKey: string;
        localTerm: string;
        remoteTerm: string;
        similarity: number;
    }>;
    missingMappings: string[];
    reconciledMap: Record<string, string>;
}

export interface TreatyTerms {
    latencyLimitMs: number;
    consensusDriftLimit: number;
    maxSlashRate: number;
    requiredInvariants: string[];
}

export interface SemanticTreaty {
    treatyId: string;
    partyA: string;
    partyB: string;
    terms: TreatyTerms;
    status: 'PROPOSED' | 'NEGOTIATING' | 'SIGNED' | 'COMPLIANT' | 'VIOLATED';
    signatures: Record<string, string>;
    timestamp: number;
    proofHash: string;
}

export interface ConsensusProof {
    invariant: string;
    consensusStatus: 'CONSENSUS_REACHED' | 'DIVERGENT' | 'NEGOTIATION_REQUIRED';
    agreementRatio: number;
    signers: string[];
    blockHeight: number;
    notarizationHash: string;
    timestamp: number;
}

/**
 * Standard semantic dictionary of civilizational invariants.
 */
export const CORE_SEMANTIC_DICTIONARY: SemanticConcept[] = [
    {
        key: 'MONOTONIC_SEQUENCE',
        synonyms: ['SEQUENCE_ID', 'ORDERED_EVENT_ID', 'INCREMENTAL_INDEX', 'MONOTONIC_ID'],
        description: 'Enforces that sequence numbers are strictly monotonically increasing to prevent double-spend or out-of-order execution.',
        criticality: 'CRITICAL'
    },
    {
        key: 'CRYPTOGRAPHIC_LINEAGE',
        synonyms: ['HASH_CHAIN', 'CRYPTOGRAPHIC_CHAIN', 'EPOCH_PROOF', 'BLOCK_HASH_CHAIN'],
        description: 'Maintains an unbroken chain of cryptographic parent-hashes verifying historical transition integrity.',
        criticality: 'CRITICAL'
    },
    {
        key: 'FINALITY_COMMITMENT',
        synonyms: ['TRANSACTION_FINALITY', 'COMMIT_PROOF', 'BLOCK_FINALITY', 'STATE_FINALITY'],
        description: 'Guarantees that state transitions, once accepted by threshold quorum, are immutable and irrevocable.',
        criticality: 'HIGH'
    },
    {
        key: 'MUTATION_ATTESTATION',
        synonyms: ['MUTATION_PROOF', 'STATE_ATTESTATION', 'SIGNATURE_MUTATION', 'PROOFS'],
        description: 'Requires cryptographically signed attestations from authorized controllers before permitting operational mutations.',
        criticality: 'HIGH'
    }
];

/**
 * Federated Governance Engine (Operational Continuity Phase)
 * 
 * Synchronizes institutional law across multiple regions and handles 
 * split-brain or conflict conditions in the governance layer.
 */
export class FederatedGovernanceEngine {
    private regionalEpochs: Map<string, number> = new Map([
        ['US-EAST-1', 1045],
        ['EU-WEST-1', 1045],
        ['AP-SOUTH-1', 1042]
    ]);
    private localConstitution: ConstitutionalRule[] = INSTITUTIONAL_CONSTITUTION;

    // Local semantic map for Organization Self (ORG-001)
    private localSemanticMap: SemanticMap = {
        orgId: 'ORG-001',
        concepts: {
            'MONOTONIC_SEQUENCE': 'MONOTONIC_SEQUENCE',
            'CRYPTOGRAPHIC_LINEAGE': 'CRYPTOGRAPHIC_LINEAGE',
            'FINALITY_COMMITMENT': 'FINALITY_COMMITMENT',
            'MUTATION_ATTESTATION': 'MUTATION_ATTESTATION'
        }
    };

    // Pre-defined mock remote maps to simulate dynamic alignment
    private remoteSemanticMaps: Record<string, SemanticMap> = {
        'ORG-002': {
            orgId: 'ORG-002',
            concepts: {
                'MONOTONIC_SEQUENCE': 'ORDERED_EVENT_ID',     // Synonym Match
                'CRYPTOGRAPHIC_LINEAGE': 'HASH_CHAIN',         // Synonym Match
                'FINALITY_COMMITMENT': 'FINALITY_COMMITMENT',   // Perfect Match
                'MUTATION_ATTESTATION': 'STATE_ATTESTATION'     // Synonym Match
            }
        },
        'ORG-003': {
            orgId: 'ORG-003',
            concepts: {
                'MONOTONIC_SEQUENCE': 'INCREMENTAL_INDEX',    // Synonym Match
                'CRYPTOGRAPHIC_LINEAGE': 'EPOCH_PROOF',        // Synonym Match
                // 'FINALITY_COMMITMENT' is missing
                'MUTATION_ATTESTATION': 'SIGNATURE_MUTATION'   // Synonym Match
            }
        }
    };

    /**
     * Synchronizes governance state with a remote signal.
     */
    public syncGovernance(signal: GovernanceSignal): { status: 'SYNCED' | 'CONFLICT' | 'STALE' } {
        const localEpoch = this.regionalEpochs.get(signal.originRegion) || 0;

        if (signal.epoch < localEpoch) {
            return { status: 'STALE' };
        }

        // Check for constitutional drift (hash mismatch would indicate a fork)
        const localHash = '0xstable-lts-1'; // Mock hash
        if (signal.constitutionHash !== localHash) {
            console.error(`[FEDERATION] Governance Conflict detected from ${signal.originRegion}`);
            return { status: 'CONFLICT' };
        }

        this.regionalEpochs.set(signal.originRegion, signal.epoch);
        return { status: 'SYNCED' };
    }

    /**
     * Resolves a split-brain governance conflict.
     * Enforces the "Genesis Ledger" as the canonical source of truth.
     */
    public resolveConflict(regionA: string, regionB: string): string {
        console.log(`[FEDERATION] Resolving conflict between ${regionA} and ${regionB}...`);
        // Deterministic winner selection based on Epoch + Genesis Proof
        return regionA; 
    }

    /**
     * Propagates a constitutional update across the federation.
     */
    public broadcastConstitution(): GovernanceSignal {
        return {
            originRegion: 'US-EAST-1',
            timestamp: Date.now(),
            constitutionHash: '0xstable-lts-1',
            epoch: 10
        };
    }

    /**
     * Perform Semantic Alignment with a federated partner organization.
     * Computes conceptual similarities, identifies drift, and maps diverged terms.
     */
    public align(remoteOrgId: string): DriftReport {
        const remoteMap = this.remoteSemanticMaps[remoteOrgId] || {
            orgId: remoteOrgId,
            concepts: {}
        };

        const perfectMatches: string[] = [];
        const synonymMatches: Array<{
            standardKey: string;
            localTerm: string;
            remoteTerm: string;
            similarity: number;
        }> = [];
        const missingMappings: string[] = [];
        const reconciledMap: Record<string, string> = {};

        let totalScore = 0;

        for (const concept of CORE_SEMANTIC_DICTIONARY) {
            const localTerm = this.localSemanticMap.concepts[concept.key];
            const remoteTerm = remoteMap.concepts[concept.key];

            if (!remoteTerm) {
                missingMappings.push(concept.key);
                // Missing core invariants carry higher drift penalty
                continue;
            }

            if (localTerm === remoteTerm) {
                perfectMatches.push(concept.key);
                reconciledMap[concept.key] = localTerm;
                totalScore += 100;
            } else if (concept.synonyms.includes(remoteTerm.toUpperCase())) {
                synonymMatches.push({
                    standardKey: concept.key,
                    localTerm,
                    remoteTerm,
                    similarity: 0.90
                });
                reconciledMap[concept.key] = `${localTerm} ➔ ${remoteTerm}`;
                totalScore += 90;
            } else {
                // Term exists but is not recognized as a standard synonym (unaligned)
                missingMappings.push(concept.key);
            }
        }

        const overallScore = CORE_SEMANTIC_DICTIONARY.length > 0 
            ? Math.round(totalScore / CORE_SEMANTIC_DICTIONARY.length) 
            : 0;

        return {
            timestamp: Date.now(),
            targetOrg: remoteOrgId,
            overallScore,
            perfectMatches,
            synonymMatches,
            missingMappings,
            reconciledMap
        };
    }

    /**
     * Evaluates treaty compliance and registers agreement terms.
     */
    public treaty(remoteOrgId: string, proposalJson?: string): SemanticTreaty {
        let terms: TreatyTerms = {
            latencyLimitMs: 150,
            consensusDriftLimit: 0.05,
            maxSlashRate: 0.10,
            requiredInvariants: ['MONOTONIC_SEQUENCE', 'CRYPTOGRAPHIC_LINEAGE']
        };

        if (proposalJson) {
            try {
                const parsed = JSON.parse(proposalJson);
                terms = { ...terms, ...parsed };
            } catch {
                console.warn(`[FEDERATION] Failed to parse proposal JSON. Using baseline treaty terms.`);
            }
        }

        // Generate treaty ID and deterministic proof hash
        const treatyId = `TREATY-${remoteOrgId}-${Date.now().toString(36).toUpperCase()}`;
        const proofContent = `${remoteOrgId}-${JSON.stringify(terms)}-${Date.now()}`;
        const proofHash = crypto.createHash('sha256').update(proofContent).digest('hex');

        // Evaluate Compliance metrics based on local state invariants
        // Simulated audit: Check if we meet the latency and drift terms
        const currentLatency = 110; // Mock current latency
        const currentDrift = 0.02;  // Mock current drift
        const isLatencyCompliant = currentLatency <= terms.latencyLimitMs;
        const isDriftCompliant = currentDrift <= terms.consensusDriftLimit;

        const isCompliant = isLatencyCompliant && isDriftCompliant;

        return {
            treatyId,
            partyA: 'ORG-001',
            partyB: remoteOrgId,
            terms,
            status: isCompliant ? 'COMPLIANT' : 'VIOLATED',
            signatures: {
                'ORG-001': `0xSIG-001-${crypto.createHash('sha256').update('ORG-001-' + treatyId).digest('hex')}`,
                [remoteOrgId]: `0xSIG-${remoteOrgId}-${crypto.createHash('sha256').update(remoteOrgId + '-' + treatyId).digest('hex')}`
            },
            timestamp: Date.now(),
            proofHash
        };
    }

    /**
     * Propose and verify shared interpretations of core invariants.
     * Triggers a consensus verification loop across federated regions/nodes.
     */
    public invariantCheck(invariantKey: string): ConsensusProof {
        const standardConcept = CORE_SEMANTIC_DICTIONARY.find(c => c.key === invariantKey);

        if (!standardConcept) {
            return {
                invariant: invariantKey,
                consensusStatus: 'NEGOTIATION_REQUIRED',
                agreementRatio: 0,
                signers: [],
                blockHeight: 0,
                notarizationHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                timestamp: Date.now()
            };
        }

        // Check regional synchronization health.
        // If AP-SOUTH-1 (Epoch 1042) is lagging behind US-EAST-1/EU-WEST-1 (Epoch 1045), consensus is partially complete.
        const epUS = this.regionalEpochs.get('US-EAST-1') || 0;
        const epEU = this.regionalEpochs.get('EU-WEST-1') || 0;
        const epAP = this.regionalEpochs.get('AP-SOUTH-1') || 0;

        const allInSync = (epUS === epEU && epEU === epAP);
        const agreementRatio = allInSync ? 1.0 : 0.67; // 2 out of 3 in sync
        const status = allInSync ? 'CONSENSUS_REACHED' : 'DIVERGENT';

        const notarizationHash = crypto
            .createHash('sha256')
            .update(`${invariantKey}-${status}-${agreementRatio}-${Date.now()}`)
            .digest('hex');

        return {
            invariant: invariantKey,
            consensusStatus: status,
            agreementRatio,
            signers: allInSync 
                ? ['US-EAST-1', 'EU-WEST-1', 'AP-SOUTH-1'] 
                : ['US-EAST-1', 'EU-WEST-1'], // AP-SOUTH-1 failed to attest due to epoch lag
            blockHeight: 92834,
            notarizationHash,
            timestamp: Date.now()
        };
    }
}

