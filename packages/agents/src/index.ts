/**
 * @packages/agents — Agent Registry
 * Re-exports all agent classes from the universal bridge.
 */
import { BaseAgent } from '@packages/utils';

export { 
    BaseAgent,
    AgentResponse,
    DatabaseAgent,
    BackendAgent,
    FrontendAgent,
    RankingAgent,
    ResumeAgent,
    DebugAgent,
    ChatEditAgent,
    CoderAgent,
    PlannerAgent,
    PolishAgent,
    SaaSMonetizationAgent,
    ResearchAgent,
    ArchitectureAgent,
    DeploymentAgent,
    SecurityAgent,
    MonitoringAgent,
    IntentDetectionAgent,
    GeneratorAgent,
    MetaAgent,
    AgentMemory,
} from '@packages/utils';

export class RepairAgent extends BaseAgent {}
export class CriticAgent extends BaseAgent {}
export class ValidatorAgent extends BaseAgent {}
