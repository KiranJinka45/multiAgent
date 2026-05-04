import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
/**
 * Standardized Zod Schemas for the MultiAgent Platform
 */
export declare const TrackEventSchema: z.ZodObject<{
    missionId: z.ZodString;
    tenantId: z.ZodString;
    eventType: z.ZodEnum<{
        mission_started: "mission_started";
        step_completed: "step_completed";
        mission_failed: "mission_failed";
        mission_completed: "mission_completed";
    }>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    timestamp: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const SubmitMissionSchema: z.ZodObject<{
    tenantId: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodAny>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const CheckoutSchema: z.ZodObject<{
    productId: z.ZodString;
}, z.core.$strip>;
/**
 * Express Middleware to validate incoming request bodies against a Zod schema.
 */
export declare const validateRequest: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=validation.d.ts.map