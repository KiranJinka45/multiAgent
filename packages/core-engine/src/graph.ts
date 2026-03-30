import { AgentRequest, AgentResponse } from '@packages/contracts';
import { logger } from '@packages/observability';
import { BaseAgent } from '@packages/agents/src/base-agent';

export type StateGraphRoute = (state: Record<string, any>) => string | Promise<string>;

export class AgentGraph {
    private nodes: Map<string, BaseAgent> = new Map();
    private edges: Map<string, { target: string; condition?: StateGraphRoute }[]> = new Map();
    private entryPoint?: string;

    /**
     * Registers an agent as a node in the graph.
     */
    addNode(name: string, agent: BaseAgent) {
        this.nodes.set(name, agent);
        return this;
    }

    /**
     * Adds a directed edge between two nodes. 
     * If a condition is provided, the edge is only traversed if it returns true.
     */
    addEdge(source: string, target: string, condition?: StateGraphRoute) {
        if (!this.edges.has(source)) this.edges.set(source, []);
        this.edges.get(source)!.push({ target, condition });
        return this;
    }

    /**
     * Sets the entry node for the graph execution.
     */
    setEntryPoint(name: string) {
        this.entryPoint = name;
        return this;
    }

    /**
     * Executes the graph continuously until an END state or no adjacent nodes are found.
     */
    async execute(initialState: Record<string, any>, requestContext: Omit<AgentRequest, 'prompt'>, maxSteps = 20): Promise<Record<string, any>> {
        if (!this.entryPoint) throw new Error('AgentGraph: Entry point not set');

        let currentNode = this.entryPoint;
        let state = { ...initialState };
        let steps = 0;

        logger.info({ entryPoint: this.entryPoint }, `[AgentGraph] Starting execution`);

        while (currentNode && steps < maxSteps) {
            logger.info({ node: currentNode, step: steps }, `[AgentGraph] Executing node`);
            const agent = this.nodes.get(currentNode);
            
            if (!agent) {
                if (currentNode === '__END__') break;
                throw new Error(`AgentGraph: Node '${currentNode}' not found`);
            }

            const request: AgentRequest = {
                ...requestContext,
                prompt: state.prompt || '',
                params: state
            };

            const response = await agent.execute(request);
            
            // Merge response data into the current state
            state = { ...state, [currentNode]: response };

            // Find next node dynamically
            const outgoingEdges = this.edges.get(currentNode) || [];
            let nextNode: string | undefined = undefined;

            for (const edge of outgoingEdges) {
                if (!edge.condition) {
                    nextNode = edge.target;
                    break;
                } else {
                    const routingDecision = await edge.condition(state);
                    if (routingDecision === edge.target || routingDecision === 'true' || routingDecision === 'true' as any) {
                        nextNode = edge.target;
                        break;
                    }
                }
            }

            if (!nextNode || nextNode === '__END__') {
                logger.info({ node: currentNode }, `[AgentGraph] Execution reached terminal state.`);
                break;
            }

            currentNode = nextNode;
            steps++;
        }

        if (steps >= maxSteps) {
            logger.warn({ maxSteps }, `[AgentGraph] Execution halted after hitting max steps limitation.`);
        }

        return state;
    }
}
