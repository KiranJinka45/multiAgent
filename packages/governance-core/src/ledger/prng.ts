export class SeededPRNG {
    private seed: number;

    constructor(seed: number = 123456789) {
        this.seed = seed;
    }

    /**
     * Simple Linear Congruential Generator (LCG).
     * Constants based on POSIX drand48: m = 2^48 (approximated here by safe integer math for JS, usually m=2^31-1 for simplicity).
     * We'll use the glibc constants for a 32-bit PRNG:
     * m = 2^31, a = 1103515245, c = 12345
     */
    next(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed;
    }

    /**
     * Returns a pseudo-random floating-point number between 0 (inclusive) and 1 (exclusive).
     */
    random(): number {
        return this.next() / 0x80000000;
    }
}
