"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.CheckoutSchema = exports.SubmitMissionSchema = exports.TrackEventSchema = void 0;
const zod_1 = require("zod");
const observability_1 = require("@packages/observability");
/**
 * Standardized Zod Schemas for the MultiAgent Platform
 */
// Event Tracking Schema (from Gateway)
exports.TrackEventSchema = zod_1.z.object({
    missionId: zod_1.z.string().uuid({ message: "Invalid missionId format" }),
    tenantId: zod_1.z.string().min(1, { message: "tenantId is required" }),
    eventType: zod_1.z.enum(['mission_started', 'step_completed', 'mission_failed', 'mission_completed']),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    timestamp: zod_1.z.string().datetime().optional()
});
// Mission Submission Schema
exports.SubmitMissionSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1, { message: "tenantId is required" }),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    priority: zod_1.z.number().int().min(1).max(10).optional().default(5)
});
// Checkout Schema
exports.CheckoutSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, { message: "productId is required" })
});
// Add more schemas as needed...
/**
 * Express Middleware to validate incoming request bodies against a Zod schema.
 */
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            // Parse and replace body with validated (and potentially coerced/stripped) data
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const issues = error.issues || error.errors || [];
                observability_1.logger.warn({ path: req.path, errors: issues }, 'Input validation failed');
                return res.status(400).json({
                    error: 'Validation failed',
                    details: issues.map((e) => ({ path: e.path.join('.'), message: e.message }))
                });
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map