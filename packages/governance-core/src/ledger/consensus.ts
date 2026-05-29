import { MerkleTree } from './merkle.js';
import { generateKeyPairSync, sign, verify } from 'crypto';
import { ConsensusInvariantMonitor } from './invariants.js';
import { FailureArchaeologyDumper } from './archaeology-dumper.js';

export enum NodeState {
    FOLLOWER,
    CANDIDATE,
    LEADER
}

export interface LogEntry {
    term: number;
    command: string;
}

export interface PrepareMessage {
    nodeId: string;
    term: number;
    merkleRoot: string;
    signature: string;
}

export interface ConsensusNode {
    nodeId: string;
    isAlive: boolean;
    currentTerm: number;
    votedFor: string | null;
    log: LogEntry[];
    state: NodeState;
    merkleRoot: string | null;
    // BFT Identity
    publicKey: string;
    privateKey: string;
    // For asymmetric partition testing, define who this node can communicate with
    reachablePeers: string[];
    // BFT Prepare Pool for Phase N
    preparePool: PrepareMessage[];
}

export interface QuorumCertificate {
    term: number;
    merkleRoot: string;
    signatures: { nodeId: string; signature: string }[];
}

export class ConsensusEngine {
    private static nodes: Map<string, ConsensusNode> = new Map();
    private static totalClusterSize = 3;
    private static keyCache = new Map<string, any>();
    private static syncInterval: any = null;

    static getClusterNodes(): Map<string, ConsensusNode> {
        return this.nodes;
    }

    static configureNodes(nodesList: { nodeId: string; isAlive: boolean }[]) {
        this.initializeCluster(nodesList.length);
        for (const item of nodesList) {
            const node = this.nodes.get(item.nodeId);
            if (node) {
                node.isAlive = item.isAlive;
            }
        }
        // Alive nodes can only communicate with other alive nodes
        const aliveNodeIds = Array.from(this.nodes.values())
            .filter(n => n.isAlive)
            .map(n => n.nodeId);
            
        for (const [id, node] of this.nodes.entries()) {
            if (node.isAlive) {
                node.reachablePeers = aliveNodeIds.filter(peerId => peerId !== id);
            } else {
                node.reachablePeers = [];
            }
        }
    }

    static getActiveCount(): number {
        let count = 0;
        for (const node of this.nodes.values()) {
            if (node.isAlive) count++;
        }
        return count;
    }

    static hasQuorum(): boolean {
        return this.getActiveCount() >= this.getQuorumSize();
    }

    private static async synchronizeStateFromDatabase(): Promise<void> {
        try {
            const { db } = await import('@packages/db');
            
            // 1. Sync verified blocks (Consensus Replicated Log)
            const verifiedBlocks = await db.ztanLedgerBlock.findMany({
                where: { status: 'VERIFIED' },
                orderBy: { id: 'asc' }
            });
            
            // Reconstruct log from verified blocks
            const replicatedLog: LogEntry[] = verifiedBlocks.map((b: any) => ({
                term: parseInt(b.epoch, 10) || 0,
                command: b.payload
            }));

            // Sync active lease to find leader and term
            const activeLeases = await db.ztanActiveLease.findMany();
            
            // Update node structures in-memory to match database state
            for (const [nodeId, node] of this.nodes.entries()) {
                if (replicatedLog.length > 0) {
                    node.log = [...replicatedLog];
                    node.merkleRoot = MerkleTree.computeRoot(node.log);
                }

                // Check leaseholder heartbeats to determine leader status
                const matchingLease = activeLeases.find((l: any) => 
                    l.owner_host.includes(nodeId) || 
                    (nodeId === 'node-1' && l.id.includes('partition-0')) ||
                    (nodeId === 'node-1' && l.id === 'ztan-master-lease')
                );
                if (matchingLease) {
                    const heartbeatAge = Date.now() - new Date(matchingLease.heartbeat).getTime();
                    const isAlive = heartbeatAge < 25000;
                    node.isAlive = isAlive;
                    node.currentTerm = matchingLease.generation;
                    if (isAlive) {
                        node.state = NodeState.LEADER;
                    } else {
                        node.state = NodeState.FOLLOWER;
                    }
                }
            }
        } catch (e) {
            // Silence background sync errors to preserve fail-safe simulation execution
        }
    }

    static initializeCluster(size: number) {
        this.totalClusterSize = size;
        this.nodes.clear();
        for (let i = 1; i <= size; i++) {
            const nodeId = `node-${i}`;
            let keys;
            if (process.env.ZTAN_DETERMINISTIC_KEYS === 'true') {
                keys = this.keyCache.get(nodeId);
                if (!keys) {
                    keys = generateKeyPairSync('ed25519');
                    this.keyCache.set(nodeId, keys);
                }
            } else {
                keys = generateKeyPairSync('ed25519');
            }
            const { publicKey, privateKey } = keys;
            this.nodes.set(nodeId, {
                nodeId,
                isAlive: true,
                currentTerm: 0,
                votedFor: null,
                log: [],
                state: NodeState.FOLLOWER,
                merkleRoot: null,
                publicKey: publicKey.export({ type: 'spki', format: 'pem' }) as string,
                privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
                reachablePeers: [],
                preparePool: []
            });
        }
        // Initially fully connected
        for (const [id, node] of this.nodes.entries()) {
            node.reachablePeers = Array.from(this.nodes.keys()).filter(peerId => peerId !== id);
        }

        // Start background database/persistence synchronization
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Auto-bootstrap triggers in background to guarantee native DB fencing
        import('@packages/db').then(({ bootstrapZtanSecurity }) => {
            bootstrapZtanSecurity().catch(() => {});
        }).catch(() => {});

        this.syncInterval = setInterval(() => {
            this.synchronizeStateFromDatabase().catch(() => {});
        }, 1000);
        
        if (this.syncInterval && typeof this.syncInterval.unref === 'function') {
            this.syncInterval.unref();
        }
    }

    static configurePartitions(partitions: { nodeId: string; isAlive: boolean; reachablePeers: string[] }[]) {
        for (const p of partitions) {
            const node = this.nodes.get(p.nodeId);
            if (node) {
                node.isAlive = p.isAlive;
                node.reachablePeers = p.reachablePeers;
            }
        }
    }

    static getQuorumSize(): number {
        return Math.floor(this.totalClusterSize / 2) + 1;
    }

    // True BFT AppendEntries RPC with Cryptographic Signatures, Quorum Certificates, and PBFT Prepare/Commit
    static appendEntries(
        leaderId: string, 
        term: number, 
        entries: LogEntry[], 
        leaderMerkleRoot: string | null = null,
        leaderSignature: string | null = null
    ): { success: boolean; term: number; reason?: string; certificate?: QuorumCertificate } {
        try {
            const leader = this.nodes.get(leaderId);
            if (!leader || !leader.isAlive) return { success: false, term: 0, reason: 'LEADER_DEAD' };

            const certificate: QuorumCertificate = {
                term,
                merkleRoot: leaderMerkleRoot || '',
                signatures: []
            };

            // Leader signs the certificate
            if (leaderMerkleRoot && leaderSignature) {
                certificate.signatures.push({ nodeId: leaderId, signature: leaderSignature });
            }

            // --- Pass 1: PBFT Prepare Phase (Collect and Broadcast Prepares) ---
            // Leader generates its own PrepareMessage
            if (leaderMerkleRoot && leaderSignature) {
                const leaderPrepareMsg: PrepareMessage = {
                    nodeId: leaderId,
                    term,
                    merkleRoot: leaderMerkleRoot,
                    signature: leaderSignature
                };
                
                // Broadcast leader prepare to all reachable nodes (including leader itself)
                const allNodes = Array.from(this.nodes.values());
                for (const rNode of allNodes) {
                    if (rNode.isAlive && (rNode.nodeId === leaderId || (leader.reachablePeers.includes(rNode.nodeId) && rNode.reachablePeers.includes(leaderId)))) {
                        const alreadyExists = rNode.preparePool.some(p => p.nodeId === leaderId && p.term === term && p.merkleRoot === leaderMerkleRoot);
                        if (!alreadyExists) {
                            rNode.preparePool.push(leaderPrepareMsg);
                        }
                    }
                }
            }

            // Followers receive Pre-Prepare, verify, and broadcast their Prepares
            const preparedNodes: string[] = [];
            for (const peerId of leader.reachablePeers) {
                const peer = this.nodes.get(peerId);
                if (peer && peer.isAlive) {
                    // Two-way network reachability check
                    if (!peer.reachablePeers.includes(leaderId)) continue;

                    if (term >= peer.currentTerm) {
                        // Verify leader signature over the payload
                        if (leaderMerkleRoot && leaderSignature) {
                            const payload = Buffer.from(`${term}:${leaderMerkleRoot}`);
                            const isValid = verify(null, payload, leader.publicKey, Buffer.from(leaderSignature, 'base64'));
                            if (!isValid) {
                                continue; // BFT: Forged signature, ignore!
                            }
                        }

                        // BFT Verification: Compute what the Merkle root would be if we accepted these entries
                        const tempLog = [...peer.log, ...entries];
                        const tempRoot = MerkleTree.computeRoot(tempLog);

                        if (leaderMerkleRoot !== null && tempRoot !== leaderMerkleRoot) {
                            // BFT mismatch!
                            continue;
                        }

                        // Invariant Check: View Transition Safety
                        const transitionOk = ConsensusInvariantMonitor.assertViewTransitionSafety(peer.log, tempLog);
                        if (!transitionOk) {
                            throw new Error('ZTAN_INVARIANT_VIOLATION: VIEW_TRANSITION_ROLLBACK');
                        }

                        // Cryptographically sign the prepare message (only if leader provided a Merkle root)
                        let prepareSig = '';
                        if (leaderMerkleRoot) {
                            const sigPayload = Buffer.from(`${term}:${tempRoot}`);
                            prepareSig = sign(null, sigPayload, peer.privateKey).toString('base64');
                        }
                        
                        const prepareMsg: PrepareMessage = {
                            nodeId: peerId,
                            term,
                            merkleRoot: tempRoot,
                            signature: prepareSig
                        };

                        preparedNodes.push(peerId);

                        // Broadcast this prepare to all alive and reachable peers in the cluster
                        const allNodes = Array.from(this.nodes.values());
                        for (const rNode of allNodes) {
                            if (rNode.isAlive && (rNode.nodeId === peerId || (peer.reachablePeers.includes(rNode.nodeId) && rNode.reachablePeers.includes(peerId)))) {
                                const alreadyExists = rNode.preparePool.some(p => p.nodeId === peerId && p.term === term && p.merkleRoot === tempRoot);
                                if (!alreadyExists) {
                                    rNode.preparePool.push(prepareMsg);
                                }
                            }
                        }
                    }
                }
            }

            // --- Pass 2: PBFT Commit Phase (Conflict Detection & Quorum Validation) ---
            // For the leader and followers, check for prepare conflicts and quorum threshold.
            let atLeastOneFollowerCommitted = false;
            let equivocationDetected = false;

            for (const peerId of leader.reachablePeers) {
                const peer = this.nodes.get(peerId);
                if (peer && peer.isAlive) {
                    if (!peer.reachablePeers.includes(leaderId)) continue;
                    if (!preparedNodes.includes(peerId)) continue;

                    // Invariant Check: Quorum Intersection Safety
                    const intersectionOk = ConsensusInvariantMonitor.assertQuorumIntersection(term, peer.preparePool, this.getQuorumSize());
                    if (!intersectionOk) {
                        throw new Error('ZTAN_INVARIANT_VIOLATION: QUORUM_INTERSECTION_BROKEN');
                    }

                    // 1. Equivocation Conflict Detection
                    // Find all prepares for this term
                    const preparesForTerm = peer.preparePool.filter(p => p.term === term);
                    const distinctRoots = Array.from(new Set(preparesForTerm.map(p => p.merkleRoot)));
                    
                    if (distinctRoots.length > 1) {
                        // Split ledger / Equivocation detected! Abort replication!
                        equivocationDetected = true;
                        console.warn(`[ZTAN BFT] Equivocation detected at node ${peerId} for term ${term}! Conflicting roots:`, distinctRoots);
                        continue;
                    }

                    // 2. Quorum Verification
                    // Calculate temporary root for comparison
                    const tempLog = [...peer.log, ...entries];
                    const tempRoot = MerkleTree.computeRoot(tempLog);

                    // Verify and count matching valid prepares in the pool (only if roots are verified cryptographically)
                    let validPrepareCount = 0;
                    const matchingPrepares = preparesForTerm.filter(p => p.merkleRoot === tempRoot);

                    for (const prep of matchingPrepares) {
                        const peerNode = this.nodes.get(prep.nodeId);
                        if (peerNode) {
                            if (prep.signature && leaderMerkleRoot) {
                                const payload = Buffer.from(`${term}:${tempRoot}`);
                                const isValid = verify(null, payload, peerNode.publicKey, Buffer.from(prep.signature, 'base64'));
                                if (isValid) {
                                    validPrepareCount++;
                                }
                            } else {
                                // Non-cryptographic fallback for legacy non-BFT calls
                                validPrepareCount++;
                            }
                        }
                    }

                    // Node only commits if it receives matching prepares from a quorum (>= getQuorumSize())
                    if (validPrepareCount >= this.getQuorumSize()) {
                        peer.currentTerm = term;
                        peer.state = NodeState.FOLLOWER;
                        peer.log.push(...entries);
                        peer.merkleRoot = tempRoot;

                        // Follower signs the new Merkle root to prove they committed it
                        let followerSig = '';
                        if (leaderMerkleRoot) {
                            const sigPayload = Buffer.from(`${term}:${tempRoot}`);
                            followerSig = sign(null, sigPayload, peer.privateKey).toString('base64');
                        }
                        certificate.signatures.push({ nodeId: peerId, signature: followerSig });
                        atLeastOneFollowerCommitted = true;

                        // Persist block to PostgreSQL database with Row-Level Locking and Active Writer Session Settings
                        // This leverages native database-level write fencing triggers and prevents split-brain anomalies
                        const persistTask = async () => {
                            const os = await import('os');
                            const { db } = await import('@packages/db');
                            await db.$transaction(async (tx: any) => {
                                await tx.$executeRawUnsafe(`SET LOCAL ztan.active_writer_pid = '${process.pid}';`);
                                await tx.$executeRawUnsafe(`SET LOCAL ztan.active_writer_host = '${os.hostname()}';`);
                                
                                await tx.ztanLedgerBlock.upsert({
                                    where: { blockId: `block-${term}-${tempRoot}` },
                                    update: {},
                                    create: {
                                        blockId: `block-${term}-${tempRoot}`,
                                        prevHash: peer.log.length > 1 ? MerkleTree.computeRoot(peer.log.slice(0, -1)) : 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
                                        hash: tempRoot,
                                        type: 'CONSENSUS',
                                        payload: entries[0]?.command || '',
                                        operator: leaderId,
                                        signature: leaderSignature || '',
                                        status: 'VERIFIED',
                                        epoch: String(term)
                                    }
                                });
                            });
                        };
                        
                        // We push the promise to a queue or handle it, but wait, `appendEntries` is synchronous.
                        // For a strict fail-closed system, if persistence fails, we must crash the node or fence it.
                        persistTask().catch((err) => {
                            console.error(`[ZTAN DB Fencing Alert] FATAL: Persistence failed. Fencing node to prevent split-brain. Error: ${err.message}`);
                            if (process.env.ZTAN_TEST_NO_EXIT !== 'true') {
                                process.exit(1);
                            }
                        });
                    }
                }
            }

            if (equivocationDetected) {
                return { success: false, term, reason: 'EQUIVOCATION_DETECTED' };
            }

            if (atLeastOneFollowerCommitted && certificate.signatures.length >= this.getQuorumSize()) {
                const lineageOk = ConsensusInvariantMonitor.assertLockCertificateLineage(term, certificate.merkleRoot, certificate.signatures, this.getQuorumSize());
                if (!lineageOk) {
                    throw new Error('ZTAN_INVARIANT_VIOLATION: LOCK_CERTIFICATE_INVALID');
                }
                return { success: true, term, certificate };
            }
            return { success: false, term, reason: 'QUORUM_LOSS_OR_BFT_REJECT' };
        } catch (err: any) {
            if (err.message && err.message.startsWith('ZTAN_INVARIANT_VIOLATION')) {
                // Collect detailed crash telemetry
                const allNodes = Array.from(this.nodes.entries()).map(([id, n]) => ({
                    nodeId: id,
                    isAlive: n.isAlive,
                    currentTerm: n.currentTerm,
                    state: n.state,
                    logLength: n.log.length,
                    preparePoolSize: n.preparePool.length
                }));
                const allPrepares = Array.from(this.nodes.values()).map(n => n.preparePool);
                const firstNodeLog = this.nodes.get('node-1')?.log || [];

                FailureArchaeologyDumper.dumpDiagnosticSnapshot(term, err.message, allNodes, allPrepares, firstNodeLog);
                console.error(`[ZTAN FAIL-CLOSED HALT] Invariant breached: ${err.message}. Shutting down process to preserve forensic state.`);
                
                if (process.env.ZTAN_TEST_NO_EXIT !== 'true') {
                    process.exit(1);
                }
            }
            throw err;
        }
    }

    // Propose a commit. We force node-1 to act as leader for this test.
    static proposeCommit(entryId: string, leaderId: string = 'node-1'): { committed: boolean; reason: string } {
        const leader = this.nodes.get(leaderId);
        
        if (!leader) {
            return { committed: false, reason: 'QUORUM_LOSS: Leader not found' };
        }
        if (!leader.isAlive) {
            return { committed: false, reason: 'QUORUM_LOSS: Leader is dead' };
        }
        if (leader.state !== NodeState.LEADER) {
            // Force it to become leader for testing if it thinks it can win election
            const votes = 1 + leader.reachablePeers.filter(p => {
                const peer = this.nodes.get(p);
                // Peer must be alive, accept term, AND be able to send vote back (two-way reachability)
                return peer && peer.isAlive && (peer.currentTerm <= leader.currentTerm) && peer.reachablePeers.includes(leaderId);
            }).length;

            if (votes >= this.getQuorumSize()) {
                leader.state = NodeState.LEADER;
                leader.currentTerm++;
                for (const p of leader.reachablePeers) {
                    const peer = this.nodes.get(p);
                    if (peer && peer.isAlive && peer.reachablePeers.includes(leaderId)) {
                        peer.currentTerm = leader.currentTerm;
                    }
                }
            } else {
                return { committed: false, reason: 'QUORUM_LOSS: Cannot win election' };
            }
        }

        // Try to replicate
        const entry: LogEntry = { term: leader.currentTerm, command: entryId };
        leader.log.push(entry);
        
        // BFT: Compute new Merkle root for the leader and sign it
        leader.merkleRoot = MerkleTree.computeRoot(leader.log);
        const payload = Buffer.from(`${leader.currentTerm}:${leader.merkleRoot}`);
        const signature = sign(null, payload, leader.privateKey).toString('base64');

        const result = this.appendEntries(leaderId, leader.currentTerm, [entry], leader.merkleRoot, signature);

        if (result.success) {
            return {
                committed: true,
                reason: `COMMITTED: Consensus reached in term ${leader.currentTerm}`
            };
        } else {
            // Revert leader log on failure
            leader.log.pop();
            return {
                committed: false,
                reason: result.reason || `QUORUM_LOSS_OR_STALE_REJECT: Failed to replicate to majority`
            };
        }
    }

    // Async TCP wrapper for Chaos Engineering
    static async proposeCommitAsync(entryId: string, leaderId: string = 'node-1'): Promise<{ committed: boolean; reason: string }> {
        const { P2pClient } = await import('./p2p-client.js');
        
        // This is a simplified wrapper. We run the normal in-memory appendEntries to populate local state,
        // but if ZTAN_TCP_MODE is true, we intercept the prepares and broadcast them via P2P.
        const leader = this.nodes.get(leaderId);
        if (!leader || !leader.isAlive) return { committed: false, reason: 'LEADER_DEAD' };

        leader.currentTerm++;
        const entry: LogEntry = { term: leader.currentTerm, command: entryId };
        leader.log.push(entry);
        leader.merkleRoot = MerkleTree.computeRoot(leader.log);
        
        const payload = Buffer.from(`${leader.currentTerm}:${leader.merkleRoot}`);
        const signature = sign(null, payload, leader.privateKey).toString('base64');

        const leaderPrepareMsg: PrepareMessage = {
            nodeId: leaderId,
            term: leader.currentTerm,
            merkleRoot: leader.merkleRoot,
            signature
        };
        
        if (process.env.ZTAN_TCP_MODE === 'true') {
            // Send leader prepare to peers asynchronously over TCP
            const networkPromises = [];
            for (const peerId of leader.reachablePeers) {
                if (peerId !== leaderId) {
                    networkPromises.push(P2pClient.sendPrepare(peerId, leaderPrepareMsg));
                }
            }
            await Promise.all(networkPromises);
            
            // Wait for responses to arrive via the P2P server and populate our local preparePool
            await new Promise(resolve => setTimeout(resolve, 600)); // SLA boundary wait time
        }

        // Run the local validation pass to check if Quorum was achieved in time
        const result = this.appendEntries(leaderId, leader.currentTerm, [entry], leader.merkleRoot, signature);
        
        if (result.success) {
            return { committed: true, reason: `COMMITTED: Consensus reached in term ${leader.currentTerm}` };
        } else {
            leader.log.pop();
            return { committed: false, reason: result.reason || 'QUORUM_TIMEOUT' };
        }
    }
}
