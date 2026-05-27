import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import { serverConfig } from '@packages/config';
import { logger } from '@packages/observability';

let memoryFallbackSecret: string | null = null;
let memoryFallbackSignatureKey: string | null = null;

function getFallbackSecret(): string {
  if (!memoryFallbackSecret) {
    memoryFallbackSecret = crypto.randomBytes(32).toString('hex');
  }
  return memoryFallbackSecret;
}

function getFallbackSignatureKey(): string {
  if (!memoryFallbackSignatureKey) {
    memoryFallbackSignatureKey = crypto.randomBytes(32).toString('hex');
  }
  return memoryFallbackSignatureKey;
}

export interface ExecutionTokenPayload {
  execution_intent_id: string;
  risk_score: number;
  policy_snapshot: string;
  audit_correlation_id: string;
  timestamp: number;
}

export function generateExecutionToken(inputs: {
  riskScore: number;
  policySnapshot: string;
}): { token: string; payload: ExecutionTokenPayload } {
  const secret = serverConfig.JWT_SECRET || getFallbackSecret();
  const executionIntentId = uuidv4();
  const auditCorrelationId = executionIntentId;

  const payload: ExecutionTokenPayload = {
    execution_intent_id: executionIntentId,
    risk_score: inputs.riskScore,
    policy_snapshot: inputs.policySnapshot,
    audit_correlation_id: auditCorrelationId,
    timestamp: Date.now()
  };

  try {
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    return { token, payload };
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to cryptographically sign execution token');
    // Fallback unsigned token format (signed with a dynamically generated fallback key)
    const token = jwt.sign(payload, getFallbackSignatureKey(), { expiresIn: '1h' });
    return { token, payload };
  }
}

