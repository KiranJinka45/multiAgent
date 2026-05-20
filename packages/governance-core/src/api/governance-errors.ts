/**
 * 11.0 Canonical Error Taxonomy
 * 
 * Freezes error semantics for the ZTAN Governance Console.
 * Prevents alerts from drifting and stops operators from improvising terminology.
 */

export enum GovernanceErrorCode {
  AUTHORITY_UNREACHABLE = 'AUTHORITY_UNREACHABLE',
  WAL_SEQUENCE_MISMATCH = 'WAL_SEQUENCE_MISMATCH',
  QUORUM_VALIDATION_FAILED = 'QUORUM_VALIDATION_FAILED',
  POLLING_BUDGET_EXCEEDED = 'POLLING_BUDGET_EXCEEDED',
  STALE_CACHE_MODE = 'STALE_CACHE_MODE',
  MUTATION_BLOCKED_READONLY = 'MUTATION_BLOCKED_READONLY',
  MOBILE_MUTATION_DENIED = 'MOBILE_MUTATION_DENIED',
  UNAUTHORIZED_OPERATOR_ROLE = 'UNAUTHORIZED_OPERATOR_ROLE',
}

export class GovernanceError extends Error {
  public readonly code: GovernanceErrorCode;
  public readonly sequenceId?: string;

  constructor(code: GovernanceErrorCode, message: string, sequenceId?: string) {
    super(message);
    this.name = 'GovernanceError';
    this.code = code;
    this.sequenceId = sequenceId;
    
    // Maintain V8 stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GovernanceError);
    }
  }

  public toJSON() {
    return {
      error: this.code,
      message: this.message,
      sequenceId: this.sequenceId,
      timestamp: new Date().toISOString(), // Standardizing purely for informational context
    };
  }
}
