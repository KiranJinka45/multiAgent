/**
 * @packages/agents — Agent Registry
 * Re-exports all agent classes from the universal bridge.
 */
import { BaseAgent } from '@packages/utils';
export { BaseAgent, DatabaseAgent, BackendAgent, FrontendAgent, RankingAgent, ResumeAgent, DebugAgent, ChatEditAgent, CoderAgent, PlannerAgent, PolishAgent, SaaSMonetizationAgent, ResearchAgent, ArchitectureAgent, DeploymentAgent, SecurityAgent, MonitoringAgent, IntentDetectionAgent, GeneratorAgent, MetaAgent, AgentMemory, } from '@packages/utils';
export declare class RepairAgent extends BaseAgent {
}
export declare class CriticAgent extends BaseAgent {
}
export declare class ValidatorAgent extends BaseAgent {
}
