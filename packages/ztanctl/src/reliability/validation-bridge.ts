import { ProductionValidationEngine } from '@packages/production-validation';

/**
 * Bridge between ztanctl and the Institutional Production Validation Engine.
 */
export function getProductionValidation(): ProductionValidationEngine {
    return new ProductionValidationEngine();
}
