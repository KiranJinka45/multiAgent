import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { HSMVault, HSMErrorCode } from '@packages/utils';
import fs from 'fs';
import path from 'path';

const fastify = Fastify({ logger: true });
fastify.register(fastifyWebsocket);

// --- STEWARDSHIP STATE ---
let currentTrustLevel = 'FULL';
let currentEpoch = 100;
let isSafeMode = false;
let isTelemetryActive = true;
let activeDrill = 'NONE';

const hsm = new HSMVault(['node-a', 'node-b', 'node-c']);

// --- DETERMINISTIC ENGINE ---
const fixtures = {
    baseline: JSON.parse(fs.readFileSync('./src/fixtures/baseline.json', 'utf8')),
    degraded: JSON.parse(fs.readFileSync('./src/fixtures/degraded.json', 'utf8')),
    adversarial: JSON.parse(fs.readFileSync('./src/fixtures/adversarial.json', 'utf8'))
};

fastify.register(async (fastify) => {
    fastify.get('/ws/stewardship', { websocket: true }, (connection, req) => {
        console.log('📡 [OPG] Operator Console connected.');

        // 1. Initial State Sync
        connection.socket.send(JSON.stringify({
            type: 'STATE_SYNC',
            payload: {
                trustLevel: currentTrustLevel,
                epoch: currentEpoch,
                isSafeMode,
                activeDrill
            }
        }));

        // 2. Stream Baseline Evidence
        fixtures.baseline.forEach((entry: any, index: number) => {
            setTimeout(() => {
                connection.socket.send(JSON.stringify({
                    type: 'EVIDENCE_STREAM',
                    payload: entry
                }));
            }, index * 1000); // 1s interval for "calm" visualization
        });

        connection.socket.on('message', async (message) => {
            const data = JSON.parse(message.toString());
            
            if (data.type === 'TRIGGER_DRILL') {
                const drillId = data.payload.drillId;
                console.log(`⚔️ [OPG] Triggering Drill: ${drillId}`);
                await handleDrill(drillId, connection.socket);
            }
        });
    });
});

async function handleDrill(drillId: string, socket: any) {
    activeDrill = drillId;
    
    switch (drillId) {
        case 'IFD-001': // Replay Determinism
            currentTrustLevel = 'FULL';
            break;
        case 'IFD-002': // Cognitive Validation (Degradation)
            currentTrustLevel = 'DEGRADED';
            socket.send(JSON.stringify({
                type: 'EVIDENCE_STREAM',
                payload: {
                    sequenceId: 1003,
                    type: 'AUTH_DEGRADATION',
                    timestamp: Date.now(),
                    payload: 'Signer node-c revoked by governance.',
                    evidence: {
                        hash: '0x1003',
                        prevHash: '0x1002',
                        signature: 'sig|100|1003|REVOKE',
                        epoch: 100,
                        trustLevel: 'DEGRADED',
                        verdict: 'DEGRADED'
                    }
                }
            }));
            break;
        case 'IFD-003': // Governance Convergence (Safe Mode)
            isSafeMode = true;
            currentTrustLevel = 'DEGRADED';
            socket.send(JSON.stringify({
                type: 'STATE_SYNC',
                payload: { trustLevel: 'DEGRADED', isSafeMode: true, activeDrill: 'IFD-003' }
            }));
            break;
        case 'IFD-004': // Adversarial (Untrusted)
            currentTrustLevel = 'UNTRUSTED';
            socket.send(JSON.stringify({
                type: 'EVIDENCE_STREAM',
                payload: {
                    sequenceId: 1004,
                    type: 'REPLAY_POISONING',
                    timestamp: Date.now(),
                    payload: 'CRITICAL: Causal rewrite attempt detected.',
                    evidence: {
                        hash: '0xPOISON',
                        prevHash: '0xFAKE',
                        signature: 'sig|100|1004|FORGED',
                        epoch: 100,
                        trustLevel: 'UNTRUSTED',
                        verdict: 'UNTRUSTED'
                    }
                }
            }));
            break;
    }

    socket.send(JSON.stringify({
        type: 'STATE_SYNC',
        payload: { trustLevel: currentTrustLevel, epoch: currentEpoch, isSafeMode, activeDrill }
    }));
}

const start = async () => {
    try {
        await fastify.listen({ port: 8080, host: '0.0.0.0' });
        console.log('🏛️ [OPG] Stewardship Orchestrator listening on port 8080');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
