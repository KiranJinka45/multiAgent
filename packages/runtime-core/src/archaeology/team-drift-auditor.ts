export interface AlertRoutingDecayReport {
  decayIndex: number; // 0 to 100%
  orphanedChannels: string[];
  singlePointsOfFailure: {
    operatorId: string;
    criticalChannels: string[];
  }[];
  isValid: boolean;
}

export interface OnboardingChecklist {
  operatorId: string;
  startDate: string; // ISO String
  attestationDate?: string; // ISO String
  checklistTasks: {
    taskName: string;
    completed: boolean;
  }[];
}

export interface OnboardingEntropyReport {
  averageOnboardingDelayDays: number;
  incompleteTaskRatio: number; // 0 to 1
  onboardingEntropyScore: number; // 0 to 100
  unattestedOperatorCount: number;
  criticalPendingTasks: string[];
}

export interface OperatorInfo {
  operatorId: string;
  communicatesWith: string[]; // List of other operatorIds
  exclusiveSubsystems: string[]; // List of systems/keys only they own
}

export interface TopologyReport {
  tribalKnowledgeIslands: string[];
  isolationIndex: number; // 0 to 100%
  topologyRiskScore: number; // 0 to 100
  isolatedOperators: string[];
}

export class TeamDriftAuditor {
  /**
   * Audits alert routing mapping to ensure all alarms route to active, valid SRE resolvers.
   */
  public auditAlertRoutingDecay(
    routingMap: Map<string, string[]>,
    activeOperators: Set<string>
  ): AlertRoutingDecayReport {
    const orphanedChannels: string[] = [];
    const spofMap = new Map<string, string[]>();

    for (const [channel, operators] of routingMap.entries()) {
      const activeResolvers = operators.filter(op => activeOperators.has(op));

      if (activeResolvers.length === 0) {
        orphanedChannels.push(channel);
      } else if (activeResolvers.length === 1) {
        const spofOp = activeResolvers[0];
        const spofs = spofMap.get(spofOp) ?? [];
        spofs.push(channel);
        spofMap.set(spofOp, spofs);
      }
    }

    const singlePointsOfFailure = Array.from(spofMap.entries()).map(([opId, channels]) => ({
      operatorId: opId,
      criticalChannels: channels
    }));

    const totalChannels = routingMap.size;
    const decayIndex = totalChannels > 0 ? Math.round((orphanedChannels.length / totalChannels) * 100) : 0;
    const isValid = orphanedChannels.length === 0 && singlePointsOfFailure.length === 0;

    return {
      decayIndex,
      orphanedChannels,
      singlePointsOfFailure,
      isValid
    };
  }

  /**
   * Measures completion delay and uncompleted checklists to track onboarding lag and responsibility diffusion.
   */
  public measureOnboardingEntropy(checklists: OnboardingChecklist[]): OnboardingEntropyReport {
    if (checklists.length === 0) {
      return {
        averageOnboardingDelayDays: 0,
        incompleteTaskRatio: 0,
        onboardingEntropyScore: 0,
        unattestedOperatorCount: 0,
        criticalPendingTasks: []
      };
    }

    let totalDelayMs = 0;
    let delayCount = 0;
    let totalTasks = 0;
    let incompleteTasks = 0;
    let unattestedCount = 0;
    const criticalPendingTasks: string[] = [];

    for (const list of checklists) {
      const start = new Date(list.startDate).getTime();

      if (list.attestationDate) {
        const attestation = new Date(list.attestationDate).getTime();
        totalDelayMs += Math.max(0, attestation - start);
        delayCount++;
      } else {
        unattestedCount++;
        // Operator is active but not attested: add current delay
        const currentDelay = Date.now() - start;
        totalDelayMs += Math.max(0, currentDelay);
        delayCount++;
      }

      for (const t of list.checklistTasks) {
        totalTasks++;
        if (!t.completed) {
          incompleteTasks++;
          if (t.taskName.toLowerCase().includes('attestation') || t.taskName.toLowerCase().includes('key')) {
            criticalPendingTasks.push(`${list.operatorId}: ${t.taskName}`);
          }
        }
      }
    }

    const averageOnboardingDelayDays = delayCount > 0 
      ? Math.round((totalDelayMs / (1000 * 60 * 60 * 24)) / delayCount * 10) / 10
      : 0;

    const incompleteTaskRatio = totalTasks > 0 ? incompleteTasks / totalTasks : 0;

    // Onboarding entropy score (0 to 100): combinations of delay and incomplete ratio
    // Assume 30 days is the maximum expected onboarding timeline for baseline scaling
    const delayRatio = Math.min(1.0, averageOnboardingDelayDays / 30);
    const entropyScoreRaw = (delayRatio * 50) + (incompleteTaskRatio * 50);
    const onboardingEntropyScore = Math.round(entropyScoreRaw);

    return {
      averageOnboardingDelayDays,
      incompleteTaskRatio: Math.round(incompleteTaskRatio * 100) / 100,
      onboardingEntropyScore,
      unattestedOperatorCount: unattestedCount,
      criticalPendingTasks
    };
  }

  /**
   * Evaluates team layout topologies to identify isolated operators and tribal knowledge islands.
   */
  public mapTopologyDegradation(operators: OperatorInfo[]): TopologyReport {
    const tribalKnowledgeIslands: string[] = [];
    const isolatedOperators: string[] = [];

    if (operators.length === 0) {
      return {
        tribalKnowledgeIslands,
        isolationIndex: 0,
        topologyRiskScore: 0,
        isolatedOperators
      };
    }

    // Count links and look for exclusive systems
    const subsystemOwners = new Map<string, string[]>();

    for (const op of operators) {
      // Isolated operator: has fewer than 2 consult communication links
      if (op.communicatesWith.length < 2) {
        isolatedOperators.push(op.operatorId);
      }

      for (const sys of op.exclusiveSubsystems) {
        const owners = subsystemOwners.get(sys) ?? [];
        owners.push(op.operatorId);
        subsystemOwners.set(sys, owners);
      }
    }

    // Find tribal knowledge islands (subsystems owned exclusively by exactly 1 operator)
    for (const [_sys, owners] of subsystemOwners.entries()) {
      if (owners.length === 1) {
        const soleOwner = owners[0];
        if (!tribalKnowledgeIslands.includes(soleOwner)) {
          tribalKnowledgeIslands.push(soleOwner);
        }
      }
    }

    const isolationIndex = Math.round((isolatedOperators.length / operators.length) * 100);

    // Calculate topology risk score (0 to 100)
    // Risk increases if we have tribal islands or high percentage of isolated operators
    const islandFactor = Math.min(1.0, tribalKnowledgeIslands.length / operators.length);
    const isolationFactor = isolationIndex / 100;
    const topologyRiskScore = Math.round((islandFactor * 60 + isolationFactor * 40) * 100) / 100;

    return {
      tribalKnowledgeIslands,
      isolationIndex,
      topologyRiskScore: Math.round(topologyRiskScore),
      isolatedOperators
    };
  }
}
