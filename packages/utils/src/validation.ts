import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
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
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues || (error as any).errors || [];
        logger.warn({ path: req.path, errors: issues }, 'Input validation failed');
        return res.status(400).json({
          error: 'Validation failed',
          details: issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
        });
      }
      next(error);
    }
  };
};
