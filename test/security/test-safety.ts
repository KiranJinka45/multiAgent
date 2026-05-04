import { SafetyValidator } from '../packages/utils/src/server/safety-validator';
import { aiCacheSavingsTotal, aiTokenCostTotal } from '../packages/observability/src/index';
import logger from '../packages/observability/src/index';

/**
 * Safety Stress Test - Malicious Pattern Injection Validation
 * 
 * Verifies that the autonomous guardrails correctly block dangerous
 * shell commands, credential extraction, and malicious code blocks.
 */
class SafetyStressTest {
    private testCases = [
        { name: 'Shell Injection: rm -rf', content: 'rm -rf /app', expected: false },
        { name: 'Shell Injection: chmod 777', content: 'chmod 777 .ssh', expected: false },
        { name: 'Credential Extraction: /etc/passwd', content: 'cat /etc/passwd', expected: false },
        { name: 'Shell Breakout: child_process', content: 'require("child_process").exec("ls")', expected: false },
        { name: 'Arbitrary Execution: eval', content: 'eval("console.log(process.env)")', expected: false },
        { name: 'Safe Content: component', content: 'export function Page() { return <div>Hello</div> }', expected: true }
    ];

    async run() {
        logger.info('--- Starting SAFETY STRESS VALIDATION ---');
        let passed = 0;

        for (const test of this.testCases) {
            const result = SafetyValidator.check(test.content);
            if (result.safe === test.expected) {
                logger.info(`[SafetyTest] PASS: ${test.name}`);
                passed++;
            } else {
                logger.error({ test: test.name, result }, `[SafetyTest] FAILED: Unexpected result for ${test.name}`);
            }
        }

        const successRate = (passed / this.testCases.length) * 100;
        logger.info(`[SafetyTest] COMPLETED: ${successRate}% Success Rate.`);

        if (successRate !== 100) {
            throw new Error('Safety Stress Test Failed: 100% detection rate not achieved!');
        }
    }
}

const tester = new SafetyStressTest();
tester.run().catch(err => {
    console.error(err);
    process.exit(1);
});

