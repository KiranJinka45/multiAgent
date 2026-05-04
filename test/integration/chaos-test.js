"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const observability_1 = __importDefault(require("@packages/observability"));
/**
 * Chaos Test Suite - Automated Failure Injection (F.I.)
 *
 * This script validates that the platform survives real-world infrastructure
 * failures by programmatically killing core pods and verifying recovery.
 */
class ChaosRunner {
    namespace = 'multiagent';
    /**
     * Test 1: Redis Master Promotion
     * Kill the master and verify Sentinel promotes a slave within 30s.
     */
    async testRedisHA() {
        observability_1.default.info('[Chaos] Failure Injection: Killing Redis Master...');
        try {
            // Find current master pod
            const masterPod = (0, child_process_1.execSync)(`kubectl get pods -n ${this.namespace} -l redis-role=master -o jsonpath='{.items[0].metadata.name}'`).toString().trim();
            (0, child_process_1.execSync)(`kubectl delete pod ${masterPod} -n ${this.namespace} --force`);
            observability_1.default.info({ masterPod }, '[Chaos] Master pod deleted. Waiting for Sentinel promotion...');
            await this.wait(15000);
            // Verify new master
            const newMaster = (0, child_process_1.execSync)(`kubectl get pods -n ${this.namespace} -l redis-role=master -o jsonpath='{.items[0].metadata.name}'`).toString().trim();
            if (newMaster && newMaster !== masterPod) {
                observability_1.default.info({ newMaster }, '[Chaos] SUCCESS: Sentinel promoted new master.');
            }
            else {
                throw new Error('Redis HA promotion failed.');
            }
        }
        catch (err) {
            observability_1.default.error({ err }, '[Chaos] FAILED: Redis HA test');
        }
    }
    /**
     * Test 2: Kafka Broker Drop
     */
    async testKafkaHA() {
        observability_1.default.info('[Chaos] Failure Injection: Killing Kafka Broker (pod-0)...');
        try {
            (0, child_process_1.execSync)(`kubectl delete pod kafka-0 -n ${this.namespace} --force`);
            observability_1.default.info('[Chaos] Kafka broker deleted. Verifying StatefulSet restart...');
            await this.wait(30000);
            const status = (0, child_process_1.execSync)(`kubectl get pod kafka-0 -n ${this.namespace} -o jsonpath='{.status.phase}'`).toString().trim();
            if (status === 'Running') {
                observability_1.default.info('[Chaos] SUCCESS: Kafka broker recovered.');
            }
            else {
                throw new Error('Kafka stateful recovery stalled.');
            }
        }
        catch (err) {
            observability_1.default.error({ err }, '[Chaos] FAILED: Kafka HA test');
        }
    }
    /**
     * Test 3: Mission Worker Crash Recovery
     */
    async testWorkerResilience() {
        observability_1.default.info('[Chaos] Failure Injection: Crashing active Mission Worker...');
        try {
            const workerPod = (0, child_process_1.execSync)(`kubectl get pods -n ${this.namespace} -l app=mission-worker -o jsonpath='{.items[0].metadata.name}'`).toString().trim();
            (0, child_process_1.execSync)(`kubectl delete pod ${workerPod} -n ${this.namespace} --force`);
            observability_1.default.info('[Chaos] Worker pod crashed. Verifying self-healing watchdog...');
            // In a real environment, we'd check the logs of missionWatchdog here.
            await this.wait(20000);
            const newWorkerCount = parseInt((0, child_process_1.execSync)(`kubectl get deployment mission-worker -n ${this.namespace} -o jsonpath='{.status.readyReplicas}'`).toString().trim());
            if (newWorkerCount >= 1) {
                observability_1.default.info('[Chaos] SUCCESS: ReplicaSet recovered worker fleet.');
            }
            else {
                throw new Error('Worker fleet failed to auto-scale back.');
            }
        }
        catch (err) {
            observability_1.default.error({ err }, '[Chaos] FAILED: Worker resilience test');
        }
    }
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async runAll() {
        observability_1.default.info('--- Starting PRODUCTION CHAOS VALIDATION ---');
        await this.testRedisHA();
        await this.testKafkaHA();
        await this.testWorkerResilience();
        observability_1.default.info('--- Chaos Validation Complete ---');
    }
}
const runner = new ChaosRunner();
runner.runAll().catch(console.error);
//# sourceMappingURL=chaos-test.js.map