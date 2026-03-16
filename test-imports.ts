import { QUEUE_VALIDATOR } from './lib/queue/agent-queues';
import redis from './shared/services/queue/redis-client';
import { DistributedExecutionContext } from './api-gateway/services/execution-context';

console.log('--- Import Test ---');
console.log('QUEUE_VALIDATOR:', QUEUE_VALIDATOR);
console.log('Redis defined:', !!redis);
console.log('DistributedExecutionContext defined:', !!DistributedExecutionContext);
process.exit(0);
