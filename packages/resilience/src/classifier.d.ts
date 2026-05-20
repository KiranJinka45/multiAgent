export declare enum FailureType {
    TRANSIENT = "TRANSIENT",
    PERMANENT = "PERMANENT",
    UNKNOWN = "UNKNOWN"
}
export declare class FailureClassifier {
    /**
     * Classifies an error to determine if it's worth replaying.
     */
    static classify(error: string): FailureType;
}
//# sourceMappingURL=classifier.d.ts.map