import { ProductionPilotEngine } from '../../../production-pilot/src/engine.js';

/**
 * Bridge between ztanctl and the Institutional Production Pilot Engine.
 */
export function getProductionPilot(): ProductionPilotEngine {
    return new ProductionPilotEngine();
}
