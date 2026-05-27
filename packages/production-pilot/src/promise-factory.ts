import { DeterministicScheduler } from './scheduler.js';

export class GovernedPromise<T = any> {
    private static scheduler: DeterministicScheduler | null = null;
    private nativePromise: Promise<T>;

    /**
     * Binds the GovernedPromise class to a specific virtual scheduler.
     */
    public static bindScheduler(scheduler: DeterministicScheduler): void {
        this.scheduler = scheduler;
    }

    public static unbindScheduler(): void {
        this.scheduler = null;
    }

    public static resolve<T>(value: T | PromiseLike<T>): GovernedPromise<T> {
        return new GovernedPromise<T>((resolve) => resolve(value));
    }

    public static reject<T = never>(reason?: any): GovernedPromise<T> {
        return new GovernedPromise<T>((_, reject) => reject(reason));
    }

    public static all<T>(values: Iterable<T | PromiseLike<T>>): GovernedPromise<T[]> {
        return new GovernedPromise<T[]>((resolve, reject) => {
            Promise.all(values).then(resolve, reject);
        });
    }

    public static race<T>(values: Iterable<T | PromiseLike<T>>): GovernedPromise<T> {
        return new GovernedPromise<T>((resolve, reject) => {
            Promise.race(values).then(resolve, reject);
        });
    }

    constructor(
        executor: (
            resolve: (value: T | PromiseLike<T>) => void,
            reject: (reason?: any) => void
        ) => void
    ) {
        this.nativePromise = new Promise<T>((resolve, reject) => {
            executor(
                (val) => {
                    const sched = GovernedPromise.scheduler;
                    if (sched) {
                        sched.schedule('promise-resolve', async () => resolve(val));
                    } else {
                        resolve(val);
                    }
                },
                (err) => {
                    const sched = GovernedPromise.scheduler;
                    if (sched) {
                        sched.schedule('promise-reject', async () => reject(err));
                    } else {
                        reject(err);
                    }
                }
            );
        });
    }

    public then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): GovernedPromise<TResult1 | TResult2> {
        return new GovernedPromise<TResult1 | TResult2>((resolve, reject) => {
            this.nativePromise.then(
                (val) => {
                    if (onfulfilled) {
                        try {
                            const res = onfulfilled(val);
                            resolve(res);
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        resolve(val as any);
                    }
                },
                (err) => {
                    if (onrejected) {
                        try {
                            const res = onrejected(err);
                            resolve(res);
                        } catch (ex) {
                            reject(ex);
                        }
                    } else {
                        reject(err);
                    }
                }
            );
        });
    }

    public catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
    ): GovernedPromise<T | TResult> {
        return this.then(null, onrejected);
    }
}
