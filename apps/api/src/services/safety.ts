import { db } from '@packages/db';
import { logger } from '@packages/observability';

/**
 * AI Safety & Policy Enforcement Engine
 * Transitions from passive filtering to active policy governance.
 */
export const safetyService = {
  // Global Safety Policies
  private_policies: {
    FS_WRITE_RESTRICTED: { level: 'HIGH', keywords: ['rm', 'chmod', 'chown', 'unlink'] },
    NETWORK_ACCESS: { level: 'MEDIUM', keywords: ['curl', 'wget', 'fetch', 'ssh'] },
    SENSITIVE_DATA: { level: 'CRITICAL', keywords: ['process.env', 'DATABASE_URL', 'SECRET', 'API_KEY'] }
  },

  /**
   * Enforces a safety policy on an agent action.
   * Returns a 'PolicyDecision' (ALLOW, REJECT, HITL_REQUIRED).
   */
  async enforcePolicy(action: string, executionId: string): Promise<{ decision: 'ALLOW' | 'REJECT' | 'HITL_REQUIRED', reason?: string }> {
    const lowAction = action.toLowerCase();
    
    // 1. Keyword Scan across all policies
    for (const [name, policy] of Object.entries(this.private_policies)) {
      const match = policy.keywords.find(k => lowAction.includes(k));
      
      if (match) {
        logger.warn({ executionId, policy: name, match }, '🚨 Policy Violation Detected');
        
        // Record to Audit Log
        await db.auditLog.create({
          data: {
            action: 'POLICY_VIOLATION',
            resource: `mission:${executionId}`,
            status: 'WARNING',
            metadata: { policy: name, match, action_preview: action.substring(0, 100) }
          }
        });

        if (policy.level === 'CRITICAL') return { decision: 'REJECT', reason: `Policy Breach: ${name}` };
        if (policy.level === 'HIGH') return { decision: 'HITL_REQUIRED', reason: `Requires Human Approval: ${name}` };
      }
    }

    // 2. Risk Score Evaluation
    const risk = this.calculateRiskScore(action);
    if (risk > 0.8) return { decision: 'HITL_REQUIRED', reason: 'High Cumulative Risk Score' };

    return { decision: 'ALLOW' };
  },

  /**
   * Calculates a risk score for an agentic operation.
   */
  calculateRiskScore(action: string): number {
    let score = 0;
    const low = action.toLowerCase();
    
    if (low.includes('delete') || low.includes('unlink')) score += 0.6;
    if (low.includes('write') || low.includes('update')) score += 0.3;
    if (low.includes('sudo') || low.includes('root')) score += 0.9;
    if (low.includes('network') || low.includes('socket')) score += 0.4;
    
    return Math.min(score, 1.0);
  },

  /**
   * Sanitizes user input to prevent prompt injection.
   */
  async sanitizePrompt(prompt: string): Promise<string> {
    const blockedKeywords = ['ignore previous instructions', 'system prompt', 'reveal secrets'];
    const lowPrompt = prompt.toLowerCase();
    
    for (const keyword of blockedKeywords) {
      if (lowPrompt.includes(keyword)) throw new Error(`Safety Alert: Unsafe content detected ("${keyword}")`);
    }

    return prompt;
  }
};

