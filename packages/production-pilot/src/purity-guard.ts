import type { ReplayReducer } from './reducer.js';
import { PurityASTScanner } from './purity-ast.js';

export class PurityViolationError extends Error {
    constructor(public readonly violationType: string, message: string) {
        super(`[PURITY VIOLATION::${violationType}] ${message}`);
        this.name = 'PurityViolationError';
    }
}

export class ReducerPurityGuard {
    private static FORBIDDEN_TOKENS = [
        'Math.random',
        'Date.now',
        'new Date',
        'setTimeout',
        'setInterval',
        'fetch',
        'axios',
        'XMLHttpRequest',
        'Promise',
        'async',
        'await'
    ];

    /**
     * Statically analyzes a reducer function's string representation for forbidden impure APIs.
     */
    public static analyzeStatic(reducer: Function): { passed: boolean; violations: string[] } {
        // Leverages the new AST lexical and scope aliasing scanner
        return PurityASTScanner.scan(reducer);
    }

    /**
     * Executes the reducer in a runtime sandbox that intercepts and blocks impure dynamic calls.
     */
    public static executeGuarded<S, E>(
        reducer: ReplayReducer<S, E>,
        state: S,
        event: E
    ): S {
        const originalRandom = Math.random;
        const originalDateNow = Date.now;
        const originalDate = globalThis.Date;

        let randomCalled = false;
        let dateNowCalled = false;
        let dateInstantiated = false;

        // Stub out impurities with trackers
        Math.random = () => {
            randomCalled = true;
            return originalRandom();
        };

        Date.now = () => {
            dateNowCalled = true;
            return originalDateNow();
        };

        // Override Date constructor
        const DateStub = function (this: any, ...args: any[]) {
            dateInstantiated = true;
            return new (originalDate as any)(...args);
        } as any;
        DateStub.now = Date.now;
        globalThis.Date = DateStub;

        try {
            const result = reducer(state, event);

            if (randomCalled) {
                throw new PurityViolationError('RANDOMNESS', 'Invocation of Math.random() detected inside pure state reducer.');
            }

            if (dateNowCalled || dateInstantiated) {
                throw new PurityViolationError('WALL_CLOCK', 'Access to Date/clock detected inside pure state reducer.');
            }

            return result;
        } catch (err: any) {
            // If the reducer execution itself threw a PurityViolationError, propagate it.
            // If it threw another error but a purity violation was detected, raise the purity violation.
            if (err instanceof PurityViolationError) {
                throw err;
            }
            if (randomCalled) {
                throw new PurityViolationError('RANDOMNESS', 'Invocation of Math.random() detected inside pure state reducer.');
            }
            if (dateNowCalled || dateInstantiated) {
                throw new PurityViolationError('WALL_CLOCK', 'Access to Date/clock detected inside pure state reducer.');
            }
            throw err;
        } finally {
            // Restore originals immediately after execution
            Math.random = originalRandom;
            Date.now = originalDateNow;
            globalThis.Date = originalDate;
        }
    }
}
