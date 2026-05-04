/**
 * Git versioning service for project codebases.
 * Handles initialized repositories, committing changes, and retrieving history.
 */
export declare class GitService {
    private git;
    private projectPath;
    constructor(projectPath: string);
    /**
     * Initializes a new git repository if it doesn't exist.
     */
    init(): Promise<void>;
    /**
     * Commits all changes in the project with a message.
     */
    commit(message: string): Promise<any>;
    /**
     * Retrieves the commit log history for the project.
     */
    getHistory(): Promise<any>;
    /**
     * Reverts the project state to a specific commit hash.
     */
    revert(hash: string): Promise<void>;
}
/**
 * Convenience function to snapshot a project.
 */
export declare function snapshotProject(projectPath: string, message: string): Promise<any>;
