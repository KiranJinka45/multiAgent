/**
 * Git Service: Handles local git operations for generated projects.
 */
export declare class GitService {
    private projectPath;
    constructor(projectPath: string);
    init(): Promise<boolean>;
    commit(message: string): Promise<boolean>;
    getHistory(): Promise<{
        id: string;
        message: string;
        timestamp: number;
    }[]>;
}
