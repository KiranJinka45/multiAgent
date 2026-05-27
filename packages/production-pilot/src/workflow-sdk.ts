import { DeterministicScheduler } from './scheduler.js';
import { SideEffectJournal } from './journal.js';
import { IngressJournal } from './ingress-journal.js';

export interface WorkflowDefinition<TArgs extends any[], TResult> {
    name: string;
    definitionFn: (...args: TArgs) => Promise<TResult>;
}

export class WorkflowContext {
    private compensations: (() => Promise<void>)[] = [];
    private queryHandlers = new Map<string, () => any>();
    private pendingSignals = new Map<string, (payload: any) => void>();

    constructor(
        public readonly scheduler: DeterministicScheduler,
        public readonly journal: SideEffectJournal,
        public readonly ingress: IngressJournal
    ) {}

    public async step<T>(name: string, stepFn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.scheduler.schedule(name, async () => {
                try {
                    const result = await stepFn();
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    public async sideEffect<T>(name: string, fn: () => Promise<T>): Promise<T> {
        return this.journal.execute(name, fn);
    }

    public compensate(compensateFn: () => Promise<void>): void {
        this.compensations.push(compensateFn);
    }

    public getCompensationsList(): (() => Promise<void>)[] {
        return this.compensations;
    }

    public executeCompensations(): Promise<void[]> {
        const reversed = [...this.compensations].reverse();
        const promises = reversed.map(comp => {
            return new Promise<void>((resolve, reject) => {
                this.scheduler.schedule(`compensate-${comp.name || 'anon'}`, async () => {
                    try {
                        await comp();
                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                });
            });
        });
        return Promise.all(promises);
    }

    public registerQuery(name: string, handler: () => any): void {
        this.queryHandlers.set(name, handler);
    }

    public query(name: string): any {
        const handler = this.queryHandlers.get(name);
        if (!handler) {
            throw new Error(`[WORKFLOW::QUERY] No handler registered for query: ${name}`);
        }
        return handler();
    }

    public async signal<T>(name: string): Promise<T> {
        return new Promise<T>((resolve) => {
            this.pendingSignals.set(name, (payload) => {
                resolve(payload);
            });
        });
    }

    public triggerSignal(name: string, payload: any): void {
        const handler = this.pendingSignals.get(name);
        if (handler) {
            this.pendingSignals.delete(name);
            const boundaryLog = this.ingress.registerBoundary('socket', { signal: name, payload });
            this.scheduler.schedule(`signal-${name}`, async () => {
                handler(boundaryLog.payload.payload);
            });
        }
    }

    public async awaitCondition(conditionFn: () => boolean, checkIntervalMs = 10): Promise<void> {
        return new Promise<void>((resolve) => {
            const check = () => {
                if (conditionFn()) {
                    resolve();
                } else {
                    this.scheduler.schedule('await-condition-check', async () => {
                        setTimeout(check, checkIntervalMs);
                    });
                }
            };
            check();
        });
    }
}

export class WorkflowSDK {
    private static activeContext?: WorkflowContext;

    public static setActiveContext(ctx: WorkflowContext): void {
        this.activeContext = ctx;
    }

    public static clearActiveContext(): void {
        this.activeContext = undefined;
    }

    public static getContext(): WorkflowContext {
        if (!this.activeContext) {
            throw new Error('[WORKFLOW::SDK] No active workflow context exists.');
        }
        return this.activeContext;
    }

    public static define<TArgs extends any[], TResult>(
        name: string,
        definitionFn: (...args: TArgs) => Promise<TResult>
    ): WorkflowDefinition<TArgs, TResult> {
        return { name, definitionFn };
    }
}

export const workflow = {
    step: <T>(name: string, stepFn: () => Promise<T>) => WorkflowSDK.getContext().step(name, stepFn),
    sideEffect: <T>(name: string, fn: () => Promise<T>) => WorkflowSDK.getContext().sideEffect(name, fn),
    compensate: (compensateFn: () => Promise<void>) => WorkflowSDK.getContext().compensate(compensateFn),
    signal: <T>(name: string) => WorkflowSDK.getContext().signal<T>(name),
    query: (name: string, handler: () => any) => WorkflowSDK.getContext().registerQuery(name, handler),
    await: (conditionFn: () => boolean, checkIntervalMs?: number) => WorkflowSDK.getContext().awaitCondition(conditionFn, checkIntervalMs),
};
