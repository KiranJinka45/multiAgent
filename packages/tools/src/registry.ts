export interface ToolContext {
    projectId: string;
    workspaceConfig?: any;
    [key: string]: any;
}

export interface AgentTool {
    name: string;
    description: string;
    schema: Record<string, any>; // JSON schema for arguments
    execute: (params: any, context: ToolContext) => Promise<any>;
}

export class ToolRegistry {
    private tools: Map<string, AgentTool> = new Map();

    register(tool: AgentTool) {
        if (this.tools.has(tool.name)) {
            console.warn(`[ToolRegistry] Overwriting existing tool: ${tool.name}`);
        }
        this.tools.set(tool.name, tool);
    }

    getTool(name: string): AgentTool | undefined {
        return this.tools.get(name);
    }

    getAllTools(): AgentTool[] {
        return Array.from(this.tools.values());
    }

    getToolsForPrompt(): string {
        return this.getAllTools().map(t => 
            `- ${t.name}: ${t.description}\n  Schema: ${JSON.stringify(t.schema)}`
        ).join('\n');
    }

    async executeTool(name: string, params: any, context: ToolContext): Promise<any> {
        const tool = this.tools.get(name);
        if (!tool) throw new Error(`Tool not found: ${name}`);
        
        try {
            return await tool.execute(params, context);
        } catch (error) {
            console.error(`[ToolRegistry] Tool ${name} execution failed:`, error);
            throw error;
        }
    }
}

// Global default registry
export const globalToolRegistry = new ToolRegistry();

