export enum LifecycleState {
    PREINIT = 'PREINIT',
    CONFIGURED = 'CONFIGURED',
    STORAGE_READY = 'STORAGE_READY',
    CONSENSUS_READY = 'CONSENSUS_READY',
    TRANSPORT_READY = 'TRANSPORT_READY',
    OBSERVABILITY_READY = 'OBSERVABILITY_READY',
    ACTIVE = 'ACTIVE',
    DRAINING = 'DRAINING',
    SHUTDOWN = 'SHUTDOWN'
}

export class RuntimeLifecycleManager {
    private currentState: LifecycleState = LifecycleState.PREINIT;
    private transitionHooks = new Map<LifecycleState, (() => Promise<void>)[]>();

    public getState(): LifecycleState {
        return this.currentState;
    }

    public onTransition(state: LifecycleState, hook: () => Promise<void>) {
        if (!this.transitionHooks.has(state)) {
            this.transitionHooks.set(state, []);
        }
        this.transitionHooks.get(state)!.push(hook);
    }

    public async transitionTo(targetState: LifecycleState): Promise<void> {
        const allowedTransitions: Record<LifecycleState, LifecycleState[]> = {
            [LifecycleState.PREINIT]: [LifecycleState.CONFIGURED],
            [LifecycleState.CONFIGURED]: [LifecycleState.STORAGE_READY, LifecycleState.SHUTDOWN],
            [LifecycleState.STORAGE_READY]: [LifecycleState.CONSENSUS_READY, LifecycleState.SHUTDOWN],
            [LifecycleState.CONSENSUS_READY]: [LifecycleState.TRANSPORT_READY, LifecycleState.SHUTDOWN],
            [LifecycleState.TRANSPORT_READY]: [LifecycleState.OBSERVABILITY_READY, LifecycleState.SHUTDOWN],
            [LifecycleState.OBSERVABILITY_READY]: [LifecycleState.ACTIVE, LifecycleState.SHUTDOWN],
            [LifecycleState.ACTIVE]: [LifecycleState.DRAINING, LifecycleState.SHUTDOWN],
            [LifecycleState.DRAINING]: [LifecycleState.SHUTDOWN],
            [LifecycleState.SHUTDOWN]: []
        };

        if (this.currentState !== targetState) {
            const allowed = allowedTransitions[this.currentState];
            if (allowed && !allowed.includes(targetState) && targetState !== LifecycleState.SHUTDOWN) {
                throw new Error(`[LIFECYCLE] Invalid state transition: ${this.currentState} -> ${targetState}`);
            }

            console.log(`[LIFECYCLE] Transitioning state: ${this.currentState} -> ${targetState}`);
            this.currentState = targetState;

            const hooks = this.transitionHooks.get(targetState) || [];
            for (const hook of hooks) {
                await hook();
            }
        }
    }
}
