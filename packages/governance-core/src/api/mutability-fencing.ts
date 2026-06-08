import { GovernanceError, GovernanceErrorCode } from './governance-errors.js';

export enum ApiMutabilityClass {
  OBSERVE = 'OBSERVE',
  CONTROLLED_MUTATION = 'CONTROLLED_MUTATION',
  QUORUM_MUTATION = 'QUORUM_MUTATION',
  FORENSIC_EXPORT = 'FORENSIC_EXPORT',
}

export interface FencingContext {
  userAgent: string;
  isMobileDevice: boolean;
  operatorRole: string;
  hasWebAuthnAttestation: boolean;
}

/**
 * 11.4 Runtime Capability Fencing Middleware
 * Validates endpoint mutation constraints against client hardware capabilities.
 */
export function enforceMutabilityFencing(
  mutabilityClass: ApiMutabilityClass,
  context: FencingContext
) {
  // Rule 1: FORENSIC_EXPORT requires SRE or Auditor role, strictly read-only
  if (mutabilityClass === ApiMutabilityClass.FORENSIC_EXPORT) {
    if (!['SRE_ADMIN', 'GOVERNANCE_AUDITOR'].includes(context.operatorRole)) {
      throw new GovernanceError(
        GovernanceErrorCode.UNAUTHORIZED_OPERATOR_ROLE,
        'Forensic exports require SRE_ADMIN or GOVERNANCE_AUDITOR role.'
      );
    }
    return true; // Read-only, safe
  }

  // Rule 2: OBSERVE is permitted across all roles and devices
  if (mutabilityClass === ApiMutabilityClass.OBSERVE) {
    return true; 
  }

  // ALL FOLLOWING CLASSES ARE MUTATION CLASSES
  // Rule 3: Ban mobile viewports from executing any mutations (11.8 Freeze)
  if (context.isMobileDevice) {
    throw new GovernanceError(
      GovernanceErrorCode.MOBILE_MUTATION_DENIED,
      'Mobile devices are strictly unsupported for operational mutations. Fencing enabled.'
    );
  }

  // Rule 4: CONTROLLED_MUTATION requires elevated operator role
  if (mutabilityClass === ApiMutabilityClass.CONTROLLED_MUTATION) {
    if (!['SRE_ADMIN', 'RECOVERY_OPERATOR'].includes(context.operatorRole)) {
      throw new GovernanceError(
        GovernanceErrorCode.UNAUTHORIZED_OPERATOR_ROLE,
        'Controlled mutations require SRE_ADMIN or RECOVERY_OPERATOR role.'
      );
    }
  }

  // Rule 5: QUORUM_MUTATION requires both elevated role AND physical WebAuthn hardware token presence
  if (mutabilityClass === ApiMutabilityClass.QUORUM_MUTATION) {
    if (!['SRE_ADMIN', 'RECOVERY_OPERATOR'].includes(context.operatorRole)) {
      throw new GovernanceError(
        GovernanceErrorCode.UNAUTHORIZED_OPERATOR_ROLE,
        'Quorum ceremonies require SRE_ADMIN or RECOVERY_OPERATOR role.'
      );
    }
    
    if (!context.hasWebAuthnAttestation) {
      throw new GovernanceError(
        GovernanceErrorCode.QUORUM_VALIDATION_FAILED,
        'Quorum mutations require physical WebAuthn hardware key touch confirmation.'
      );
    }
  }

  return true;
}

export interface FencingRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    role?: string;
  };
}

export interface FencingResponse {
  status(code: number): {
    json(data: unknown): unknown;
  };
}

/**
 * Example Express/Fastify Middleware Wrapper
 */
export const mutabilityGuard = (mutabilityClass: ApiMutabilityClass) => {
  return (req: FencingRequest, res: FencingResponse, next: () => void) => {
    try {
      const userAgent = (req.headers['user-agent'] as string) || '';
      const isMobileDevice = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent);
      
      const context: FencingContext = {
        userAgent,
        isMobileDevice,
        operatorRole: req.user?.role || 'GUEST',
        hasWebAuthnAttestation: req.headers['x-webauthn-attestation'] === 'true', // Simplified for example
      };

      enforceMutabilityFencing(mutabilityClass, context);
      next();
    } catch (error) {
      if (error instanceof GovernanceError) {
        const govError = error as GovernanceError;
        return res.status(403).json(govError.toJSON());
      }
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Unknown fencing error' });
    }
  };
};
