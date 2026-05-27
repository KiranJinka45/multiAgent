export class VectorClock {
    private clock = new Map<string, number>();

    constructor(private readonly nodeId: string) {
        this.clock.set(nodeId, 0);
    }

    public tick(): void {
        const current = this.clock.get(this.nodeId) || 0;
        this.clock.set(this.nodeId, current + 1);
    }

    public getClock(): Record<string, number> {
        const obj: Record<string, number> = {};
        for (const [k, v] of this.clock.entries()) {
            obj[k] = v;
        }
        return obj;
    }

    public update(incoming: Record<string, number>): void {
        // Merge vector clocks taking the maximum value of each key
        for (const [node, value] of Object.entries(incoming)) {
            const current = this.clock.get(node) || 0;
            this.clock.set(node, Math.max(current, value));
        }
        this.tick(); // Tick local clock after ingestion
    }

    /**
     * Enforces that the current node is causally eligible to process an event
     * depending on its causal dependency bounds.
     */
    public isCausallyEligible(dependencies: Record<string, number>): boolean {
        for (const [node, value] of Object.entries(dependencies)) {
            const current = this.clock.get(node) || 0;
            if (current < value) {
                return false;
            }
        }
        return true;
    }
}
