/**
 * Plugin Runner: Executes plugins in a constrained environment.
 */
export declare class PluginRunner {
    private projectPath;
    constructor(projectPath: string);
    runPlugin(pluginName: string, context: any): Promise<{
        status: string;
        issues: number;
    } | {
        status: string;
        filesModified: number;
    }>;
    private runLinter;
    private runFormatter;
}
