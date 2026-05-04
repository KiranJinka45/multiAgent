/**
 * Agent Services: Advanced AI logic for planning, debugging, and quality scoring.
 */
export interface Task {
    id: string;
    type: 'frontend' | 'backend' | 'database';
    description: string;
    dependsOn?: string[];
}
export interface Plan {
    tasks: Task[];
}
export declare class AgentServices {
    /**
     * Planner Agent: Generates a task DAG based on user prompt.
     */
    plannerAgent(prompt: string): Promise<Plan>;
    /**
     * Debug Agent: Analyzes build errors and generates code fixes.
     */
    debugAgent(error: string | Error, task: Task): Promise<string>;
    /**
     * Evaluator Agent: Scores build quality.
     */
    evaluatorAgent(): Promise<number>;
}
export declare const agentServices: AgentServices;
