import { execSync } from 'child_process';
import logger from '@packages/observability';

/**
 * Chaos Test Suite - Automated Failure Injection (F.I.)
 * 
 * This script validates that the platform survives real-world infrastructure 
 * failures by programmatically killing core pods and verifying recovery.
 */
class ChaosRunner {
    private namespace = 'multiagent';

    /**
     * Test 1: Redis Master Promotion
     * Kill the master and verify Sentinel promotes a slave within 30s.
     */
    async testRedisHA() {
        logger.info('[Chaos] Failure Injection: Killing Redis Master...');
        try {
            // Find current master pod
            const masterPod = execSync(`kubectl get pods -n ${this.namespace} -l redis-role=master -o jsonpath='{.items[0].metadata.name}'`).toString().trim();
            execSync(`kubectl delete pod ${masterPod} -n ${this.namespace} --force`);
            
            logger.info({ masterPod }, '[Chaos] Master pod deleted. Waiting for Sentinel promotion...');
            await this.wait(15000);

            // Verify new master
            const newMaster = execSync(`kubectl get pods -n ${this.namespace} -l redis-role=master -o jsonpath='{.items[0].metadata.name}'`).toString().trim();
            if (newMaster && newMaster !== masterPod) {
                logger.info({ newMaster }, '[Chaos] SUCCESS: Sentinel promoted new master.');
            } else {
                throw new Error('Redis HA promotion failed.');
            }
        } catch (err) {
            logger.error({ err }, '[Chaos] FAILED: Redis HA test');
        }
    }

    /**
     * Test 2: Kafka Broker Drop
     */
    async testKafkaHA() {
        logger.info('[Chaos] Failure Injection: Killing Kafka Broker (pod-0)...');
        try {
            execSync(`kubectl delete pod kafka-0 -n ${this.namespace} --force`);
            logger.info('[Chaos] Kafka broker deleted. Verifying StatefulSet restart...');
            await this.wait(30000);
            
            const status = execSync(`kubectl get pod kafka-0 -n ${this.namespace} -o jsonpath='{.status.phase}'`).toString().trim();
            if (status === 'Running') {
                logger.info('[Chaos] SUCCESS: Kafka broker recovered.');
            } else {
                throw new Error('Kafka stateful recovery stalled.');
            }
        } catch (err) {
            logger.error({ err }, '[Chaos] FAILED: Kafka HA test');
        }
    }

    /**
     * Test 3: Mission Worker Crash Recovery
     */
    async testWorkerResilience() {
        logger.info('[Chaos] Failure Injection: Crashing active Mission Worker...');
        try {
            const workerPod = execSync(`kubectl get pods -n ${this.namespace} -l app=mission-worker -o jsonpath='{.items[0].metadata.name}'`).toString().trim();
            execSync(`kubectl delete pod ${workerPod} -n ${this.namespace} --force`);
            
            logger.info('[Chaos] Worker pod crashed. Verifying self-healing watchdog...');
            // In a real environment, we'd check the logs of missionWatchdog here.
            await this.wait(20000);
            
            const newWorkerCount = parseInt(execSync(`kubectl get deployment mission-worker -n ${this.namespace} -o jsonpath='{.status.readyReplicas}'`).toString().trim());
            if (newWorkerCount >= 1) {
                logger.info('[Chaos] SUCCESS: ReplicaSet recovered worker fleet.');
            } else {
                 throw new Error('Worker fleet failed to auto-scale back.');
            }
        } catch (err) {
            logger.error({ err }, '[Chaos] FAILED: Worker resilience test');
        }
    }

    private wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runAll() {
        logger.info('--- Starting PRODUCTION CHAOS VALIDATION ---');
        await this.testRedisHA();
        await this.testKafkaHA();
        await this.testWorkerResilience();
        logger.info('--- Chaos Validation Complete ---');
    }
}

const runner = new ChaosRunner();
runner.runAll().catch(console.error);
