import { ComplexityRouter } from './complexity-router.js';
import { describe, it, expect, afterEach } from 'vitest';

describe('Complexity Router', () => {
    it('should route simple tasks to GEMINI_FLASH', () => {
        const result = ComplexityRouter.routeObjective('Read the contents of config.json');
        expect(result.assignedTier).toBe('FAST_TIER');
        expect(result).toHaveProperty('resolvedProvider');
    });

    it('should route reasoning tasks to CLAUDE_OPUS or CLAUDE_SONNET', () => {
        const result = ComplexityRouter.routeObjective('Analyze the architecture and design a system coordination strategy');
        expect(result.assignedTier).toBe('STRATEGIC_TIER');
        expect(result).toHaveProperty('resolvedProvider');
    });

    it('should route test running tasks to CLAUDE_SONNET', () => {
        const result = ComplexityRouter.routeObjective('Execute the test suite and optimize coverage');
        expect(result.assignedTier).toBe('SMART_TIER');
    });

    it('should route parser tasks to GEMINI_PRO', () => {
        const result = ComplexityRouter.routeObjective('Parse the XML data from config server');
        expect(result.assignedTier).toBe('BALANCED_TIER');
    });

    it('should map explicit agent type directly', () => {
        const result = ComplexityRouter.routeObjective('Help with whatever', 'system-designer');
        expect(result.assignedTier).toBe('STRATEGIC_TIER');
        expect(result.reason).toContain('system-designer');
    });

    describe('resolvedProvider', () => {
        const originalEnv = { ...process.env };

        afterEach(() => {
            // Restore original env
            process.env = { ...originalEnv };
        });

        it('should resolve provider from LLM_PROVIDER env var', () => {
            process.env.LLM_PROVIDER = 'groq';
            const result = ComplexityRouter.routeObjective('Read a file');
            expect(result.resolvedProvider).toBe('GROQ');
        });

        it('should resolve provider from GROQ_API_KEY when LLM_PROVIDER is absent', () => {
            delete process.env.LLM_PROVIDER;
            process.env.GROQ_API_KEY = 'test-key';
            const result = ComplexityRouter.routeObjective('Read a file');
            expect(result.resolvedProvider).toBe('GROQ');
        });

        it('should resolve OPENAI from OPENAI_API_KEY', () => {
            delete process.env.LLM_PROVIDER;
            delete process.env.GROQ_API_KEY;
            process.env.OPENAI_API_KEY = 'test-key';
            const result = ComplexityRouter.routeObjective('Read a file');
            expect(result.resolvedProvider).toBe('OPENAI');
        });

        it('should return UNKNOWN when no provider env is set', () => {
            delete process.env.LLM_PROVIDER;
            delete process.env.GROQ_API_KEY;
            delete process.env.OPENAI_API_KEY;
            delete process.env.ANTHROPIC_API_KEY;
            delete process.env.GOOGLE_API_KEY;
            const result = ComplexityRouter.routeObjective('Read a file');
            expect(result.resolvedProvider).toBe('UNKNOWN');
        });

        it('should include resolvedProvider in every route attestation shape', () => {
            const result = ComplexityRouter.routeObjective('Analyze the architecture');
            expect(result).toEqual(expect.objectContaining({
                prompt: expect.any(String),
                assignedTier: expect.any(String),
                resolvedProvider: expect.any(String),
                reason: expect.any(String)
            }));
        });
    });
});

