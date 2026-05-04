import { SCMNode } from './scm.types';
import { CounterfactualEngine } from './counterfactual-engine';

export interface Action {
  name: string;
  intervention: Record<string, number>;
}

export class ActionEvaluator {
  private engine: CounterfactualEngine;

  constructor() {
    // Define the default structural model for the environment
    const nodes: SCMNode[] = [
      {
        id: 'db-primary',
        parents: [],
        fn: () => 0.01 // Base health
      },
      {
        id: 'redis-cache',
        parents: [],
        fn: () => 0.01
      },
      {
        id: 'api-service',
        parents: ['db-primary', 'redis-cache'],
        fn: (inputs) => {
          // API latency/anomaly is a weighted combination of its dependencies
          return (0.7 * (inputs['db-primary'] || 0)) + (0.3 * (inputs['redis-cache'] || 0));
        }
      },
      {
        id: 'web-frontend',
        parents: ['api-service'],
        fn: (inputs) => (inputs['api-service'] || 0) * 0.9
      }
    ];

    this.engine = new CounterfactualEngine(nodes);
  }

  public evaluate(currentState: Record<string, number>, actions: Action[]) {
    return actions.map(action => {
      const predictedState = this.engine.simulate(currentState, action.intervention);
      const predictedHealth = this.engine.computeSystemHealth(predictedState);
      const currentHealth = this.engine.computeSystemHealth(currentState);

      return {
        action: action.name,
        intervention: action.intervention,
        predictedHealth,
        improvement: predictedHealth - currentHealth,
        predictedState
      };
    }).sort((a, b) => b.predictedHealth - a.predictedHealth);
  }

  public getDefaultActions(targetNode: string): Action[] {
    const actions: Action[] = [
      {
        name: 'NO_ACTION',
        intervention: {}
      }
    ];

    if (targetNode !== 'NONE') {
      actions.push({
        name: `RESTART_${targetNode.toUpperCase()}`,
        intervention: { [targetNode]: 0.05 } // Restoring health
      });
      
      actions.push({
        name: `SCALE_${targetNode.toUpperCase()}_UP`,
        intervention: { [targetNode]: 0.15 } // Partial restoration
      });
    }

    return actions;
  }
}

export const actionEvaluator = new ActionEvaluator();
