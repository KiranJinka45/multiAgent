/**
 * ZTAN — Tiered Verdict Classification Engine
 *
 * Replaces binary PASS/FAIL with a 5-tier classification that reflects
 * operational reality instead of masking it.
 *
 * Tiers (ordered by strictness):
 *   PASS_PRISTINE   — Zero failures, zero warnings, all metrics nominal
 *   PASS_DEGRADED   — Zero failures, but warnings were emitted (e.g., elevated latency, high ELU)
 *   PASS_RECOVERED  — Availability degradation occurred but the system self-healed
 *   PASS_PARTIAL    — Recovery exceeded RTO or non-critical SLO bounds were violated
 *   FAIL            — Hard invariant violations (data loss, causal discontinuity, unrecoverable crash)
 *
 * INVARIANT vs SLO SEPARATION:
 *
 *   Hard Invariants (always FAIL):
 *     - Data loss
 *     - Ledger discontinuity / causal break
 *     - Duplicate monotonic sequence IDs
 *     - Unrecoverable process crash
 *     - Supply chain / provenance / attestation failure
 *     - Quarantine breach
 *     - Unclean shutdown (SIGKILL required)
 *
 *   Soft SLOs (tiered by severity):
 *     - Latency degradation           → PASS_DEGRADED (warning only)
 *     - Elevated RSS / ELU            → PASS_DEGRADED (warning only)
 *     - Partial timeout burst          → PASS_RECOVERED (if self-healed)
 *     - Recovery exceeded RTO          → PASS_PARTIAL
 *     - Error budget consumption       → PASS_PARTIAL
 *     - Delayed convergence            → PASS_PARTIAL
 *
 * RIGID TIER CEILINGS:
 *   The following conditions impose an absolute ceiling on the verdict tier.
 *   No amount of recovery or clean shutdown can promote the verdict above
 *   the ceiling imposed by the worst observed condition.
 *
 *   | Condition                        | Verdict Ceiling |
 *   |----------------------------------|-----------------|
 *   | Data loss / ledger discontinuity | FAIL            |
 *   | Duplicate monotonic IDs          | FAIL            |
 *   | Process crash (unrecoverable)    | FAIL            |
 *   | Unclean shutdown (SIGKILL)       | FAIL            |
 *   | Provenance / attestation breach  | FAIL            |
 *   | Recovery exceeded RTO            | PASS_PARTIAL    |
 *   | Error budget > 100%             | PASS_PARTIAL    |
 *   | Availability degradation (healed)| PASS_RECOVERED  |
 *   | Elevated latency / ELU only      | PASS_DEGRADED   |
 */

// ---------------------------------------------------------------------------
// Hard invariant patterns — these always produce FAIL, no exceptions.
// These represent data integrity and trust-boundary violations that
// cannot be downgraded or recovered from.
// ---------------------------------------------------------------------------
const HARD_INVARIANT_PATTERNS = [
  'data loss',
  'ledger discontinuity',
  'ledger corruption',
  'causal discontinuity',
  'causal break',
  'sequence drift',
  'duplicate monotonic',
  'duplicate sequence',
  'unrecoverable',
  'premature exit',
  'supply chain',
  'provenance',
  'attestation',
  'quarantine breach',
];

// ---------------------------------------------------------------------------
// Tier ceiling patterns — these cap the maximum achievable verdict tier.
// Even if everything else is clean, these conditions impose an upper bound.
// ---------------------------------------------------------------------------
const TIER_CEILING_PATTERNS = {
  INDETERMINATE: [
    'telemetry chain corruption',
    'missing intervals',
    'monotonic timestamp violation',
    'regression data poisoning',
    'replay provenance mismatch',
    'instrumentation corruption',
    'telemetry signature',
    'telemetry sequence gap',
    'telemetry hash chain break',
    'telemetry timestamp rollback',
    'nan/infinity in telemetry',
    'self-verification failure',
    'measurement substrate'
  ],
  // FAIL ceiling: hard invariants handled above
  // PASS_PARTIAL ceiling: recovery problems, budget breaches
  PASS_PARTIAL: [
    'recovery exceeded rto',
    'rto exceeded',
    'error budget exceeded',
    'budget exceeded',
    'convergence timeout',
    'delayed convergence',
    'sigkill',                    // process required SIGKILL = unclean lifecycle
  ],
  // PASS_RECOVERED ceiling: availability degradation that self-healed
  PASS_RECOVERED: [
    'availability degradation',
    'service unavailable',
    'partial timeout',
    'connection refused',
    'reconnect storm',
    'request failure',
    'timeout',
    'econnreset',
  ],
  // PASS_DEGRADED ceiling: soft performance degradation
  PASS_DEGRADED: [
    'elevated latency',
    'high elu',
    'elevated rss',
    'memory drift',
    'handle accumulation',
  ],
};

// Tier ordering for ceiling comparison (lower index = more severe)
const TIER_ORDER = ['INDETERMINATE', 'FAIL', 'PASS_PARTIAL', 'PASS_RECOVERED', 'PASS_DEGRADED', 'PASS_PRISTINE'];

/**
 * @typedef {Object} VerdictInput
 * @property {number} failures - Total count of hard failures detected
 * @property {number} warnings - Total count of soft warnings emitted
 * @property {number} recoveries - Number of failures that were subsequently self-healed
 * @property {string[]} indeterminateFailures - List of telemetry/provenance failures (triggers INDETERMINATE)
 * @property {string[]} criticalFailures - List of critical failure descriptions (hard invariant violations)
 * @property {string[]} nonCriticalFailures - List of non-critical threshold violations (SLO breaches)
 * @property {string[]} [warningMessages=[]] - List of warning descriptions for ceiling analysis
 * @property {boolean} [cleanShutdown=true] - Whether all processes exited gracefully
 */

/**
 * @typedef {Object} Verdict
 * @property {'INDETERMINATE'|'FAIL'|'PASS_PARTIAL'|'PASS_RECOVERED'|'PASS_DEGRADED'|'PASS_PRISTINE'} tier
 * @property {string} emoji - Visual indicator for log output
 * @property {string} label - Human-readable label
 * @property {string} description - Detailed explanation of the classification
 * @property {number} exitCode - Process exit code (0 for any PASS tier, 1 for FAIL and INDETERMINATE)
 * @property {string|null} ceilingReason - If a ceiling was applied, explains why
 */

/**
 * Determine the ceiling imposed by a set of failure/warning messages.
 * Returns the most restrictive (lowest) tier ceiling found.
 *
 * @param {string[]} messages - All failure and warning messages to analyze
 * @returns {{ ceiling: string, reason: string } | null}
 */
function computeTierCeiling(messages) {
  let worstCeiling = null;
  let worstReason = null;

  for (const msg of messages) {
    const lower = msg.toLowerCase();

    // Check INDETERMINATE first (since observer corruption invalidates hard failures)
    if (TIER_CEILING_PATTERNS.INDETERMINATE.some(p => lower.includes(p))) {
      return { ceiling: 'INDETERMINATE', reason: `Measurement substrate integrity failed: "${msg}"` };
    }

    // Check hard invariants first (FAIL ceiling)
    if (HARD_INVARIANT_PATTERNS.some(p => lower.includes(p))) {
      return { ceiling: 'FAIL', reason: `Hard invariant violation: "${msg}"` };
    }

    // Check tiered ceilings
    for (const [tier, patterns] of Object.entries(TIER_CEILING_PATTERNS)) {
      if (tier === 'INDETERMINATE') continue;
      if (patterns.some(p => lower.includes(p))) {
        if (!worstCeiling || TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(worstCeiling)) {
          worstCeiling = tier;
          worstReason = `Ceiling imposed by: "${msg}" → max tier: ${tier}`;
        }
      }
    }
  }

  return worstCeiling ? { ceiling: worstCeiling, reason: worstReason } : null;
}

/**
 * Apply a tier ceiling: if the proposed tier is less severe than the ceiling,
 * downgrade to the ceiling.
 *
 * @param {string} proposedTier
 * @param {string} ceilingTier
 * @returns {string} - The effective tier (the more severe of the two)
 */
function applyTierCeiling(proposedTier, ceilingTier) {
  const proposedIdx = TIER_ORDER.indexOf(proposedTier);
  const ceilingIdx = TIER_ORDER.indexOf(ceilingTier);
  // Lower index = more severe. Take the more severe.
  return proposedIdx <= ceilingIdx ? proposedTier : ceilingTier;
}

/**
 * Classify the campaign outcome into a tiered verdict.
 *
 * Classification proceeds in two phases:
 *   1. Propose a tier based on failure/recovery/warning counts
 *   2. Apply rigid ceiling constraints based on message pattern analysis
 *
 * @param {VerdictInput} input
 * @returns {Verdict}
 */
export function classifyVerdict(input) {
  const {
    failures = 0,
    warnings = 0,
    recoveries = 0,
    failedRequests = 0, // Count of transient request/connection failures
    criticalFailures = [],
    nonCriticalFailures = [],
    warningMessages = [],
    cleanShutdown = true,
    indeterminateFailures = [],
  } = input;

  // --- Phase 1: Propose a tier ---

  let proposedTier;
  let description;

  // INDETERMINATE: Measurement substrate integrity failed
  if (indeterminateFailures.length > 0) {
    proposedTier = 'INDETERMINATE';
    description = `Measurement substrate integrity failed: ${indeterminateFailures.join('; ')}`;
  }
  // FAIL: Any explicit critical failure, unclean shutdown, or hard failures
  else if (criticalFailures.length > 0 || !cleanShutdown || failures > 0) {
    proposedTier = 'FAIL';
    description = criticalFailures.length > 0
      ? `Hard invariant violation(s): ${criticalFailures.join('; ')}`
      : !cleanShutdown
        ? 'Unclean shutdown — not all processes exited gracefully'
        : `${failures} hard invariant failure(s) observed.`;
  }
  // PASS_PARTIAL: Non-critical threshold violations (SLO breaches) present
  else if (nonCriticalFailures.length > 0) {
    proposedTier = 'PASS_PARTIAL';
    description = `Operational with non-critical SLO/threshold violations: ${nonCriticalFailures.join('; ')}.`;
  }
  // PASS_RECOVERED: Active failures/timeouts occurred, but self-healed and system converged
  else if (failedRequests > 0 || recoveries > 0) {
    proposedTier = 'PASS_RECOVERED';
    description = `Transient failures occurred (${failedRequests} failed requests/timeouts), but the system successfully self-healed and converged.`;
  }
  // PASS_DEGRADED: No failures, but warnings or soft performance degradation observed
  else if (warnings > 0 || warningMessages.length > 0) {
    const allWarns = [...warningMessages, ...nonCriticalFailures];
    proposedTier = 'PASS_DEGRADED';
    description = `Zero failures, but performance warnings observed: ${allWarns.join('; ') || 'degraded performance bounds'}.`;
  }
  // PASS_PRISTINE: Absolutely clean (zero failures, zero warnings, zero recovery events, zero failed requests)
  else {
    proposedTier = 'PASS_PRISTINE';
    description = 'Zero request failures, zero warnings, zero recovery events. All SRE operational bounds met cleanly.';
  }

  // --- Phase 2: Apply rigid ceiling constraints ---

  const allMessages = [
    ...indeterminateFailures.map(f => `Measurement substrate failure: ${f}`),
    ...criticalFailures,
    ...nonCriticalFailures,
    ...warningMessages,
  ];

  let ceilingReason = null;
  const ceiling = computeTierCeiling(allMessages);

  if (ceiling) {
    const effectiveTier = applyTierCeiling(proposedTier, ceiling.ceiling);
    if (effectiveTier !== proposedTier) {
      ceilingReason = ceiling.reason;
      description += ` [Ceiling applied: ${ceiling.reason}]`;
    }
    proposedTier = effectiveTier;
  }

  // --- Build result ---

  const TIER_META = {
    'INDETERMINATE':  { emoji: '❓', label: 'CAMPAIGN INDETERMINATE', exitCode: 1 },
    'FAIL':           { emoji: '❌', label: 'CAMPAIGN FAILED',            exitCode: 1 },
    'PASS_PARTIAL':   { emoji: '⚠️',  label: 'CAMPAIGN PASSED (PARTIAL)',   exitCode: 0 },
    'PASS_RECOVERED': { emoji: '🔄', label: 'CAMPAIGN PASSED (RECOVERED)', exitCode: 0 },
    'PASS_DEGRADED':  { emoji: '🟡', label: 'CAMPAIGN PASSED (DEGRADED)',  exitCode: 0 },
    'PASS_PRISTINE':  { emoji: '🎉', label: 'CAMPAIGN PASSED (PRISTINE)', exitCode: 0 },
  };

  const meta = TIER_META[proposedTier];

  return {
    tier: proposedTier,
    emoji: meta.emoji,
    label: meta.label,
    description,
    exitCode: meta.exitCode,
    ceilingReason,
  };
}

/**
 * Check if a failure description matches known hard invariant patterns.
 * @param {string} failureDescription
 * @returns {boolean}
 */
export function isCriticalFailure(failureDescription) {
  const lower = failureDescription.toLowerCase();
  return HARD_INVARIANT_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * Format a verdict for log output.
 * @param {Verdict} verdict
 * @param {string} campaignName - Name of the soak campaign
 * @returns {string}
 */
export function formatVerdict(verdict, campaignName) {
  const lines = [
    '================================================================',
    `${verdict.emoji}  ${verdict.label}`,
    `    Tier: ${verdict.tier}`,
    `    Campaign: ${campaignName}`,
    `    ${verdict.description}`,
  ];
  if (verdict.ceilingReason) {
    lines.push(`    ⚠️  Ceiling: ${verdict.ceilingReason}`);
  }
  lines.push('================================================================');
  return lines.join('\n');
}
