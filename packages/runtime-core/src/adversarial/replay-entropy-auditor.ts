import * as crypto from 'node:crypto';

export interface SemanticIntegrityScore {
  integrityScore: number; // 0 to 100
  orderScore: number;      // 0 to 100
  mutationScore: number;   // 0 to 100
  timingScore: number;     // 0 to 100
  classification: 'PRISTINE' | 'DEGRADED' | 'UNTRUSTED' | 'INVALID';
}

export interface ReplayUncertaintyEnvelope {
  avgJitterMs: number;
  maxJitterMs: number;
  skippedTransactionCount: number;
  addedTransactionCount: number;
  driftRatePpm: number;
}

export interface CausalNode {
  blockId: string;
  sequenceId: number;
  hash: string;
  prevHash: string;
  payload: string;
  timestamp: string;
  parentIds: string[];
  divergent: boolean;
}

export interface CausalDriftGraph {
  nodes: Map<string, CausalNode>;
  forkPoints: string[];
  leafNodes: string[];
}

export interface DivergenceCluster {
  clusterId: string;
  rootForkBlockId: string;
  memberSequenceIds: number[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export class ReplayEntropyAuditor {
  /**
   * Evaluates how much semantic integrity survived over a replay trace compared to the expected sequence.
   */
  public computeSemanticIntegrityScore(
    expected: any[],
    actual: any[]
  ): { score: SemanticIntegrityScore; envelope: ReplayUncertaintyEnvelope } {
    if (expected.length === 0) {
      return {
        score: { integrityScore: 0, orderScore: 0, mutationScore: 0, timingScore: 0, classification: 'INVALID' },
        envelope: { avgJitterMs: 0, maxJitterMs: 0, skippedTransactionCount: 0, addedTransactionCount: 0, driftRatePpm: 0 }
      };
    }

    // Sort by sequenceId for analysis
    const getSeq = (b: any) => parseInt(b.sequenceId ?? b.blockId, 10);
    const sortedExpected = [...expected].sort((a, b) => getSeq(a) - getSeq(b));
    const sortedActual = [...actual].sort((a, b) => getSeq(a) - getSeq(b));

    // 1. Calculate Sequence Order Score using LCS (Longest Common Subsequence) ratio
    // Use the original actual list to preserve replayed trace ordering
    const lcs = this.computeLCSLength(
      sortedExpected.map(b => getSeq(b)),
      actual.map(b => getSeq(b))
    );

    const orderScore = Math.round((lcs / sortedExpected.length) * 100);

    // 2. Calculate Mutation Completeness Score
    // Normalize payloads to ignore volatile fields (uuids, timestamps)
    let matchedMutations = 0;
    const actualMap = new Map<number, any>(sortedActual.map(b => [getSeq(b), b]));
    let skippedCount = 0;

    for (const expBlock of sortedExpected) {
      const seq = getSeq(expBlock);
      const actBlock = actualMap.get(seq);
      if (!actBlock) {
        skippedCount++;
        continue;
      }

      const expPayloadNormalized = this.normalizePayload(expBlock.payload);
      const actPayloadNormalized = this.normalizePayload(actBlock.payload);

      if (expPayloadNormalized === actPayloadNormalized) {
        matchedMutations++;
      } else {
        // Partial score for partially matching strings
        const similarity = this.stringSimilarity(expPayloadNormalized, actPayloadNormalized);
        matchedMutations += similarity;
      }
    }
    const mutationScore = Math.round((matchedMutations / sortedExpected.length) * 100);

    // 3. Calculate Temporal Drift Score
    // Evaluate intervals between successive blocks to measure jitter and drift
    let totalJitter = 0;
    let maxJitter = 0;
    let timingScoreRaw = 100;
    let jitterPoints = 0;
    let totalExpectedDuration = 0;
    let totalActualDuration = 0;

    for (let i = 1; i < sortedExpected.length; i++) {
      const expPrevTime = new Date(sortedExpected[i - 1].timestamp).getTime();
      const expCurrTime = new Date(sortedExpected[i].timestamp).getTime();
      const expInterval = expCurrTime - expPrevTime;

      const seqCurr = getSeq(sortedExpected[i]);
      const seqPrev = getSeq(sortedExpected[i - 1]);
      const actCurr = actualMap.get(seqCurr);
      const actPrev = actualMap.get(seqPrev);

      if (actCurr && actPrev) {
        const actPrevTime = new Date(actPrev.timestamp).getTime();
        const actCurrTime = new Date(actCurr.timestamp).getTime();
        const actInterval = actCurrTime - actPrevTime;

        const jitter = Math.abs(actInterval - expInterval);
        totalJitter += jitter;
        if (jitter > maxJitter) {
          maxJitter = jitter;
        }
        jitterPoints++;

        totalExpectedDuration += expInterval;
        totalActualDuration += actInterval;
      }
    }

    const avgJitter = jitterPoints > 0 ? totalJitter / jitterPoints : 0;
    // timing score decays as avg jitter increases: 100ms average jitter drops score by 10 points
    timingScoreRaw = Math.max(0, 100 - (avgJitter / 10));
    const timingScore = Math.round(timingScoreRaw);

    const addedCount = Math.max(0, sortedActual.length - lcs);

    // Calculate PPM drift rate
    let driftRatePpm = 0;
    if (totalExpectedDuration > 0) {
      const durationDiff = Math.abs(totalActualDuration - totalExpectedDuration);
      driftRatePpm = Math.round((durationDiff / totalExpectedDuration) * 1000000);
    }

    const integrityScoreRaw = (orderScore * 0.3) + (mutationScore * 0.4) + (timingScore * 0.3);
    const integrityScore = Math.round(integrityScoreRaw);

    let classification: SemanticIntegrityScore['classification'] = 'INVALID';
    if (integrityScore >= 95) {
      classification = 'PRISTINE';
    } else if (integrityScore >= 80) {
      classification = 'DEGRADED';
    } else if (integrityScore >= 50) {
      classification = 'UNTRUSTED';
    }

    return {
      score: {
        integrityScore,
        orderScore,
        mutationScore,
        timingScore,
        classification
      },
      envelope: {
        avgJitterMs: Math.round(avgJitter * 100) / 100,
        maxJitterMs: maxJitter,
        skippedTransactionCount: skippedCount,
        addedTransactionCount: addedCount,
        driftRatePpm
      }
    };
  }

  /**
   * Builds a DAG representing causal flows and fork points in the blockchain ledger state.
   */
  public buildCausalDriftGraph(blocks: any[]): CausalDriftGraph {
    const graph: CausalDriftGraph = {
      nodes: new Map(),
      forkPoints: [],
      leafNodes: []
    };

    if (blocks.length === 0) return graph;

    // First pass: add all nodes
    for (const b of blocks) {
      const id = b.blockId ?? b.hash;
      graph.nodes.set(id, {
        blockId: id,
        sequenceId: parseInt(b.sequenceId ?? b.blockId, 10),
        hash: b.hash,
        prevHash: b.prevHash,
        payload: b.payload,
        timestamp: b.timestamp ?? b.createdAt?.toISOString(),
        parentIds: [],
        divergent: false
      });
    }

    // Second pass: map parent links and trace forks
    const hashToNodeId = new Map<string, string>();
    for (const [id, node] of graph.nodes.entries()) {
      hashToNodeId.set(node.hash, id);
    }

    const childCounts = new Map<string, number>();

    for (const [id, node] of graph.nodes.entries()) {
      const parentId = hashToNodeId.get(node.prevHash);
      if (parentId) {
        node.parentIds.push(parentId);
        childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1);
      } else if (node.prevHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && node.prevHash !== '') {
        // Missing parent node in set: mark node as divergent
        node.divergent = true;
      }
    }

    // Resolve fork points (nodes with multiple children) and leaf nodes (nodes with 0 children)
    for (const [id, node] of graph.nodes.entries()) {
      const children = childCounts.get(id) ?? 0;
      if (children > 1) {
        graph.forkPoints.push(id);
      }
      if (children === 0) {
        graph.leafNodes.push(id);
      }
    }

    return graph;
  }

  /**
   * Clusters divergent nodes into group clusters associated with their respective fork source block.
   */
  public clusterDivergences(graph: CausalDriftGraph): DivergenceCluster[] {
    const clusters: Map<string, DivergenceCluster> = new Map();
    let clusterCounter = 1;

    // Identify divergent blocks (nodes that are marked divergent, or whose parents are not in the main sequence)
    // To make it simple, we check which nodes are children of forkPoints or do not link to the genesis block sequence
    // Find genesis (block with no parents and seqId equal to 1000 or lowest sequence)
    let genesisNode: CausalNode | null = null;
    let lowestSeq = Infinity;
    for (const node of graph.nodes.values()) {
      if (node.sequenceId < lowestSeq) {
        lowestSeq = node.sequenceId;
        genesisNode = node;
      }
    }

    const mainChain = new Set<string>();
    if (genesisNode) {
      let current: CausalNode | undefined = genesisNode;
      // Trace linearly for the main sequence chain (assuming single child path as default)
      while (current) {
        mainChain.add(current.blockId);
        // Find child nodes
        const children: CausalNode[] = [];
        for (const n of graph.nodes.values()) {
          if (n.parentIds.includes(current.blockId)) {
            children.push(n);
          }
        }
        // Take the one with lowest sequenceId or first child as main chain continuation
        children.sort((a, b) => a.sequenceId - b.sequenceId);
        current = children[0];
      }
    }

    // All nodes not in mainChain are considered drifted/divergent
    for (const node of graph.nodes.values()) {
      if (mainChain.has(node.blockId)) {
        continue;
      }

      // Track back to find the root fork point (last parent that is in the mainChain)
      let rootForkId = 'UNKNOWN';
      let path: string[] = [node.blockId];
      let queue = [...node.parentIds];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const currId = queue.shift()!;
        if (visited.has(currId)) continue;
        visited.add(currId);

        if (mainChain.has(currId)) {
          rootForkId = currId;
          break;
        } else {
          const parentNode = graph.nodes.get(currId);
          if (parentNode) {
            queue.push(...parentNode.parentIds);
          }
        }
      }

      if (rootForkId !== 'UNKNOWN') {
        let cluster = clusters.get(rootForkId);
        if (!cluster) {
          cluster = {
            clusterId: `CLUSTER-${clusterCounter++}`,
            rootForkBlockId: rootForkId,
            memberSequenceIds: [],
            severity: 'MEDIUM',
            description: `Divergent branch emerging from block ${rootForkId}`
          };
          clusters.set(rootForkId, cluster);
        }
        cluster.memberSequenceIds.push(node.sequenceId);
      }
    }

    // Refine cluster severity
    for (const cluster of clusters.values()) {
      cluster.memberSequenceIds.sort((a, b) => a - b);
      const span = cluster.memberSequenceIds.length;
      if (span > 10) {
        cluster.severity = 'CRITICAL';
        cluster.description += `. Out-of-control divergent sequence of ${span} blocks.`;
      } else if (span > 3) {
        cluster.severity = 'HIGH';
        cluster.description += `. Large divergence branch of ${span} blocks.`;
      } else {
        cluster.severity = 'MEDIUM';
        cluster.description += `. Minor divergence of ${span} blocks.`;
      }
    }

    return Array.from(clusters.values());
  }

  // --- PRIVATE UTILITIES ---

  private normalizePayload(payload: string): string {
    // Strip correlation traces: [CorrelationTrace: ...]
    let normalized = payload.replace(/\[CorrelationTrace:\s*[^\]]+\]/gi, '');
    // Strip timestamp or dynamic date logs
    normalized = normalized.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '');
    // Normalize spaces and casing
    return normalized.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private stringSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Use Levenshtein distance similarity index
    const m = s1.length;
    const n = s2.length;
    const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1, // deletion
          d[i][j - 1] + 1, // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = d[m][n];
    const maxLength = Math.max(s1.length, s2.length);
    return 1.0 - distance / maxLength;
  }

  private computeLCSLength(arr1: number[], arr2: number[]): number {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }
}
