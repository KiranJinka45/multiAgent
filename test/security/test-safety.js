"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const safety_validator_1 = require("../packages/utils/src/server/safety-validator");
const index_1 = __importDefault(require("../packages/observability/src/index"));
/**
 * Safety Stress Test - Malicious Pattern Injection Validation
 *
 * Verifies that the autonomous guardrails correctly block dangerous
 * shell commands, credential extraction, and malicious code blocks.
 */
class SafetyStressTest {
    testCases = [
        { name: 'Shell Injection: rm -rf', content: 'rm -rf /app', expected: false },
        { name: 'Shell Injection: chmod 777', content: 'chmod 777 .ssh', expected: false },
        { name: 'Credential Extraction: /etc/passwd', content: 'cat /etc/passwd', expected: false },
        { name: 'Shell Breakout: child_process', content: 'require("child_process").exec("ls")', expected: false },
        { name: 'Arbitrary Execution: eval', content: 'eval("console.log(process.env)")', expected: false },
        { name: 'Safe Content: component', content: 'export function Page() { return <div>Hello</div> }', expected: true }
    ];
    async run() {
        index_1.default.info('--- Starting SAFETY STRESS VALIDATION ---');
        let passed = 0;
        for (const test of this.testCases) {
            const result = safety_validator_1.SafetyValidator.check(test.content);
            if (result.safe === test.expected) {
                index_1.default.info(`[SafetyTest] PASS: ${test.name}`);
                passed++;
            }
            else {
                index_1.default.error({ test: test.name, result }, `[SafetyTest] FAILED: Unexpected result for ${test.name}`);
            }
        }
        const successRate = (passed / this.testCases.length) * 100;
        index_1.default.info(`[SafetyTest] COMPLETED: ${successRate}% Success Rate.`);
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
//# sourceMappingURL=test-safety.js.map