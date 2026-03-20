import { redis } from '@libs/utils';
console.log('Redis client found:', !!redis);
process.exit(0);
