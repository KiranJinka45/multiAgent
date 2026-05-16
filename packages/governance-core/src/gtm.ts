export interface PilotCustomer {
    name: string;
    sector: 'FINTECH' | 'INFRA' | 'ENTERPRISE';
    stage: 'PILOT' | 'PRODUCTION' | 'EXPANSION';
    adoptionScore: number; // 0 to 1
}

/**
 * Institutional Go-To-Market (GTM) Engine (Market Phase)
 * 
 * Manages the institutional adoption pipeline, positioning alignment, 
 * and Ideal Customer Profile (ICP) validation.
 */
export class GTMEngine {
    private customers: PilotCustomer[] = [];

    /**
     * Registers a new institutional pilot customer.
     */
    public registerPilot(customer: PilotCustomer): void {
        console.log(`[GTM] Registering ${customer.sector} pilot for ${customer.name}...`);
        this.customers.push(customer);
    }

    /**
     * Validates category resonance for an institution.
     */
    public validatePositioning(customerName: string): { resonances: string[], friction: string[] } {
        return {
            resonances: ['Replayability', 'Governance-Safe Rollback', 'Institutional Determinism'],
            friction: ['Initial Procurement Complexity', 'Audit Integration']
        };
    }

    /**
     * Aggregates adoption velocity across the pipeline.
     */
    public getAdoptionMetrics(): { totalPilots: number, productionConversionRate: number } {
        const prod = this.customers.filter(c => c.stage === 'PRODUCTION').length;
        return {
            totalPilots: this.customers.length,
            productionConversionRate: this.customers.length > 0 ? prod / this.customers.length : 0
        };
    }
}
import chalk from 'chalk';
