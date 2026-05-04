/**
 * PREVIEW WATCHDOG RUNTIME MONITOR
 * Monitors service health and initiates automated recovery sequences.
 */
export declare const PreviewWatchdog: {
    start(): Promise<void>;
    stop(): Promise<void>;
    checkHealth(id: string): Promise<boolean>;
};
export default PreviewWatchdog;
