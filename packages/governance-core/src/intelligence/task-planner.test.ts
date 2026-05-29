import { DecompositionPlanner, type TaskPlan } from './task-planner.js';
import { describe, it, expect } from 'vitest';

describe('Decomposition Planner', () => {
    it('should decompose an objective into a plan with multiple steps', () => {
        const plan = DecompositionPlanner.createPlan('Fix the bug', 'tenant-1');
        
        expect(plan.objective).toBe('Fix the bug');
        expect(plan.steps.length).toBeGreaterThan(1);
        
        // Ensure steps are valid proposals
        expect(plan.steps[0]).toHaveProperty('toolName');
    });

    it('should pass validation when plan is acyclic', () => {
        const plan: TaskPlan = {
            objective: 'Acyclic Plan',
            steps: [
                { id: '1', toolName: 'test', tenantId: 't1', payload: '', dependencies: [] },
                { id: '2', toolName: 'test', tenantId: 't1', payload: '', dependencies: ['1'] },
                { id: '3', toolName: 'test', tenantId: 't1', payload: '', dependencies: ['2'] }
            ]
        };

        expect(() => DecompositionPlanner.validatePlan(plan)).not.toThrow();
    });

    it('should throw an error when plan contains dependency cycles', () => {
        const plan: TaskPlan = {
            objective: 'Cyclic Plan',
            steps: [
                { id: '1', toolName: 'test', tenantId: 't1', payload: '', dependencies: ['3'] },
                { id: '2', toolName: 'test', tenantId: 't1', payload: '', dependencies: ['1'] },
                { id: '3', toolName: 'test', tenantId: 't1', payload: '', dependencies: ['2'] }
            ]
        };

        expect(() => DecompositionPlanner.validatePlan(plan)).toThrow('CYCLIC_DEPENDENCY_DETECTED');
    });
});
