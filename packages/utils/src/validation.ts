import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@packages/observability';

/**
 * Standardized Zod Schemas for the MultiAgent Platform
 */

// Event Tracking Schema (from Gateway)
export const TrackEventSchema = z.object({
  missionId: z.string().uuid({ message: "Invalid missionId format" }),
  tenantId: z.string().min(1, { message: "tenantId is required" }),
  eventType: z.enum(['mission_started', 'step_completed', 'mission_failed', 'mission_completed']),
  details: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime().optional()
});

// Mission Submission Schema
export const SubmitMissionSchema = z.object({
  tenantId: z.string().min(1, { message: "tenantId is required" }),
  payload: z.record(z.string(), z.any()),
  priority: z.number().int().min(1).max(10).optional().default(5)
});

// Checkout Schema
export const CheckoutSchema = z.object({
  productId: z.string().min(1, { message: "productId is required" })
});

// Add more schemas as needed...

/**
 * Express Middleware to validate incoming request bodies against a Zod schema.
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and replace body with validated (and potentially coerced/stripped) data
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        logger.warn({ path: req.path, errors: issues }, 'Input validation failed');
        return res.status(400).json({
          error: 'Validation failed',
          details: issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
        });
      }
      return next(error);
    }
  };
};
/**
 * Mandatory Startup Secret Validation
 * Prevents system launch with insecure, default, or weak cryptographic secrets.
 */
export function validateStartupSecrets(requiredSecrets: string[]): void {
    const defaultValues = ['changeme', 'example', '12345678', 'password', 'secret', 'undefined', 'null'];
    const missing = [];
    const weak = [];

    for (const key of requiredSecrets) {
        const val = process.env[key];
        
        if (!val) {
            missing.push(key);
            continue;
        }

        const normalizedVal = val.toLowerCase();
        const isDefault = defaultValues.some(d => normalizedVal.includes(d));
        
        // Institutional Requirement: Minimum 32 characters for HMAC/JWT/KMS keys
        if (val.length < 32 || isDefault) {
            weak.push(key);
        }
    }

    if (missing.length > 0) {
        console.error(`[FATAL] MISSION REJECTED: Mandatory security secrets missing: ${missing.join(', ')}`);
        process.exit(1);
    }

    if (weak.length > 0) {
        console.error(`[FATAL] SECURITY VIOLATION: Weak or default secrets detected: ${weak.join(', ')}`);
        console.error(`[FATAL] Ensure all secrets are > 32 chars and not using default strings.`);
        process.exit(1);
    }

    logger.info('[Security] Startup secret entropy verified.');
}
