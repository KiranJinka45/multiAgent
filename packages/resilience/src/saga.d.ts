export type SagaStep<T = any> = {
    name: string;
    action: (data: T) => Promise<any>;
    compensate: (data: T) => Promise<void>;
};
export declare function runSaga<T>(sagaName: string, steps: SagaStep<T>[], initialData: T): Promise<boolean>;
//# sourceMappingURL=saga.d.ts.map