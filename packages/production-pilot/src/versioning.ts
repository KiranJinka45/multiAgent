import type { ReplayReducer } from './reducer.js';

export interface VersionedEvent<E = any> {
    schemaVersion: string;
    payload: E;
}

export class ReducerRegistry<S, E = any> {
    private reducers = new Map<string, ReplayReducer<S, E>>();

    public register(schemaVersion: string, reducer: ReplayReducer<S, E>): void {
        this.reducers.set(schemaVersion, reducer);
    }

    public getReducer(schemaVersion: string): ReplayReducer<S, E> {
        const reducer = this.reducers.get(schemaVersion);
        if (!reducer) {
            throw new Error(`[VERSIONING] No state reducer registered for schema version: "${schemaVersion}"`);
        }
        return reducer;
    }

    /**
     * Dynamic routing reducer that executes appropriate versioned logic depending on event header version.
     */
    public routeReducer(): ReplayReducer<S, VersionedEvent<E>> {
        return (state: S, versionedEvent: VersionedEvent<E>) => {
            const reducer = this.getReducer(versionedEvent.schemaVersion);
            return reducer(state, versionedEvent.payload);
        };
    }
}
