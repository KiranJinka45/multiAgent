import dotenv from 'dotenv';
dotenv.config();

// Enforce fallback environments for local test isolation
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@127.0.0.1:54399/multiagent';
process.env.MOCK_DB = process.env.MOCK_DB || 'true';

import { Command } from 'commander';
import { injectDbOutage, clearDbOutage } from '../packages/db/src/index';

/**
 * ─── ZTAN Developer Pathology & Chaos Injector CLI ──────────────────────────
 * Stateless CLI daemon triggering connection pool floods, storage exhaustion,
 * packet loss, and block chain rot in active proxy nodes.
 * ────────────────────────────────────────────────────────────────────────────
 */

const program = new Command();

program
    .name('chaos-injector')
    .description('ZTAN Developer Pathology & Chaos Injector CLI')
    .version('1.0.0');

program
    .command('disk-full')
    .description('Inject a simulated storage/disk exhaustion outage')
    .option('-d, --duration <ms>', 'Outage duration in milliseconds', '10000')
    .action((options) => {
        const duration = parseInt(options.duration, 10);
        console.log(`⚡ Injecting DISK-FULL pathology for ${duration}ms...`);
        injectDbOutage(duration, 'disk-full');
        console.log('✅ Injection complete. Shared state updated.');
    });

program
    .command('network-drop')
    .description('Inject a simulated network/database outage')
    .option('-d, --duration <ms>', 'Outage duration in milliseconds', '10000')
    .action((options) => {
        const duration = parseInt(options.duration, 10);
        console.log(`⚡ Injecting NETWORK-DROP pathology for ${duration}ms...`);
        injectDbOutage(duration, 'db');
        console.log('✅ Injection complete. Shared state updated.');
    });

program
    .command('pool-flood')
    .description('Inject a simulated connection pool saturation')
    .option('-d, --duration <ms>', 'Outage duration in milliseconds', '10000')
    .action((options) => {
        const duration = parseInt(options.duration, 10);
        console.log(`⚡ Injecting POOL-FLOOD pathology for ${duration}ms...`);
        injectDbOutage(duration, 'pool');
        console.log('✅ Injection complete. Shared state updated.');
    });

program
    .command('corrupt-wal')
    .description('Inject a simulated WAL record corruption on write')
    .option('-d, --duration <ms>', 'Outage duration in milliseconds', '10000')
    .action((options) => {
        const duration = parseInt(options.duration, 10);
        console.log(`⚡ Injecting CORRUPT-WAL pathology for ${duration}ms...`);
        injectDbOutage(duration, 'corrupt-payload');
        console.log('✅ Injection complete. Shared state updated.');
    });

program
    .command('clear')
    .description('Clear all simulated outages')
    .action(() => {
        console.log('⚡ Clearing all injected pathologies...');
        clearDbOutage();
        console.log('✅ Outage state cleared successfully.');
    });

program.parse(process.argv);
