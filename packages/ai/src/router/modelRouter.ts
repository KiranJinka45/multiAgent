// packages/ai/router/modelRouter.ts
import { MODEL_REGISTRY, ModelConfig } from './modelRegistry';
import { EvaluatorService } from '../evaluator';

export type TaskType =
  | "code-gen"
  | "debug"
  | "refactor"
  | "planning"
  | "security-scan";

export interface RoutingContext {
  fileCount?: number;
  errorDepth?: number;
  hasBackendLogic?: boolean;
  usesAuth?: boolean;
  usesDB?: boolean;
  failCount?: number;
}

export function estimateComplexity(context: RoutingContext): number {
  let score = 0;

  if ((context.fileCount || 0) > 10) score += 0.3;
  if ((context.errorDepth || 0) > 2) score += 0.3;
  if (context.hasBackendLogic) score += 0.2;
  if (context.usesAuth || context.usesDB) score += 0.2;

  return Math.min(score, 1);
}

export async function selectModel(task: TaskType, context: RoutingContext): Promise<ModelConfig> {
  const complexity = estimateComplexity(context);
  const failCount = context.failCount || 0;

  // 1. Static Rules & Escalation
  if (failCount >= 2) return MODEL_REGISTRY.PREMIUM;
  if (failCount === 1) return MODEL_REGISTRY.BALANCED;

  // 2. Performance-Aware Feedback Loop (EMA)
  // If the cheapest model has a history of poor quality (smoothed by EMA), escalate immediately
  const cheapPerformance = await EvaluatorService.getEMAPerformance(MODEL_REGISTRY.CHEAP.model);
  const balancedPerformance = await EvaluatorService.getEMAPerformance(MODEL_REGISTRY.BALANCED.model);
  const ESCALATION_THRESHOLD = 0.6;

  let forcedEscalation = false;
  if (cheapPerformance !== null && cheapPerformance < ESCALATION_THRESHOLD) {
      forcedEscalation = true;
  }

  // 3. Task-based logic
  if (task === "planning") return MODEL_REGISTRY.PREMIUM;
  if (task === "security-scan") return MODEL_REGISTRY.BALANCED;

  if (task === "debug") {
    const base = complexity > 0.6 ? MODEL_REGISTRY.BALANCED : MODEL_REGISTRY.CHEAP;
    if (forcedEscalation && base === MODEL_REGISTRY.CHEAP) return MODEL_REGISTRY.BALANCED;
    return base;
  }

  if (task === "code-gen") {
    const base = complexity > 0.7 ? MODEL_REGISTRY.PREMIUM : MODEL_REGISTRY.BALANCED;
    if (balancedPerformance !== null && balancedPerformance < 0.6 && base === MODEL_REGISTRY.BALANCED) {
        return MODEL_REGISTRY.PREMIUM;
    }
    return base;
  }

  // DEFAULT
  const final = complexity > 0.5 ? MODEL_REGISTRY.BALANCED : MODEL_REGISTRY.CHEAP;
  if (forcedEscalation && final === MODEL_REGISTRY.CHEAP) return MODEL_REGISTRY.BALANCED;
  return final;
}
