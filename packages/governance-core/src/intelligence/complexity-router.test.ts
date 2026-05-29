import { ComplexityRouter } from './complexity-router.js';
import { describe, it, expect } from 'vitest';

describe('Complexity Router', () => {
    it('should route simple tasks to GEMINI_FLASH', () => {
        const result = ComplexityRouter.routeObjective('Read the contents of config.json');
        expect(result.assignedTier).toBe('GEMINI_FLASH');
    });

    it('should route reasoning tasks to CLAUDE_OPUS or CLAUDE_SONNET', () => {
        const result = ComplexityRouter.routeObjective('Analyze the architecture and design a system coordination strategy');
        expect(result.assignedTier).toBe('CLAUDE_OPUS');
    });

    it('should route test running tasks to CLAUDE_SONNET', () => {
        const result = ComplexityRouter.routeObjective('Execute the test suite and optimize coverage');
        expect(result.assignedTier).toBe('CLAUDE_SONNET');
    });

    it('should route parser tasks to GEMINI_PRO', () => {
        const result = ComplexityRouter.routeObjective('Parse the XML data from config server');
        expect(result.assignedTier).toBe('GEMINI_PRO');
    });

    it('should map explicit agent type directly', () => {
        const result = ComplexityRouter.routeObjective('Help with whatever', 'system-designer');
        expect(result.assignedTier).toBe('CLAUDE_OPUS');
        expect(result.reason).toContain('system-designer');
    });
});
