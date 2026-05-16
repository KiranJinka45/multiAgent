import * as crypto from 'crypto';

/**
 * Seeded Pseudo-Random Number Generator
 */
export class SeededRNG {
    private seed: string;
    constructor(seed: string) {
        this.seed = seed;
    }
    next(): number {
        const hash = crypto.createHash('sha256').update(this.seed).digest();
        this.seed = hash.toString('hex');
        return parseInt(this.seed.substring(0, 8), 16) / 0xFFFFFFFF;
    }
}

/**
 * Adversarial Network Simulator
 * Controls the delivery, ordering, and integrity of messages.
 */
export class AdversarialNetwork<T> {
    private queue: { payload: T; delay: number; drop?: boolean }[] = [];
    private rng: SeededRNG;

    constructor(seed: string) {
        this.rng = new SeededRNG(seed);
    }

    /**
     * Injects a message into the network with adversarial faults.
     */
    public send(payload: T, options: { 
        minDelay?: number, 
        maxDelay?: number, 
        dropProbability?: number,
        duplicateProbability?: number 
    } = {}) {
        const { 
            minDelay = 0, 
            maxDelay = 10, 
            dropProbability = 0, 
            duplicateProbability = 0 
        } = options;

        // Fault: Drop
        if (this.rng.next() < dropProbability) return;

        // Fault: Duplicate
        const count = this.rng.next() < duplicateProbability ? 2 : 1;

        for (let i = 0; i < count; i++) {
            const delay = Math.floor(this.rng.next() * (maxDelay - minDelay)) + minDelay;
            this.queue.push({ payload, delay });
        }

        // Fault: Reorder (Randomize queue occasionally)
        if (this.rng.next() < 0.3) {
            this.queue.sort(() => this.rng.next() - 0.5);
        }
    }

    /**
     * Advances the network state and returns messages ready for delivery.
     */
    public tick(): T[] {
        const ready: T[] = [];
        this.queue = this.queue.filter(msg => {
            if (msg.delay <= 0) {
                ready.push(msg.payload);
                return false;
            }
            msg.delay--;
            return true;
        });
        return ready;
    }

    public get pendingCount(): number {
        return this.queue.length;
    }
}
