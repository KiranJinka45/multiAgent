import { ConsensusEngine } from '../src/index.js';
process.env.ZTAN_DETERMINISTIC_KEYS = 'true';
ConsensusEngine.initializeCluster(3);
const result = ConsensusEngine.proposeCommit('TEST', 'node-1');
console.log(result);
