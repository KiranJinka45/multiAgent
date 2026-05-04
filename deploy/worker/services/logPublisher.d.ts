/**
 * Publishes a log message for a specific project to Redis.
 * This will be picked up by the API gateway and broadcast to connected clients via Socket.io.
 */
export declare function publishLog(projectId: string, message: string, type?: 'info' | 'error' | 'success'): Promise<void>;
