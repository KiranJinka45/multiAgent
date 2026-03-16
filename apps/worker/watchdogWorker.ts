import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PreviewWatchdog } from '../runtime/watchdog';
import logger from '@config/logger';

async function main() {
    logger.info('[WatchdogWorker] Starting background resource monitor...');
    
    // Start the watchdog check loop
    PreviewWatchdog.start();

    // Handle termination
    process.on('SIGTERM', () => {
        logger.info('[WatchdogWorker] Shutting down...');
        PreviewWatchdog.stop();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        logger.info('[WatchdogWorker] Shutting down...');
        PreviewWatchdog.stop();
        process.exit(0);
    });

    // Keep process alive
    setInterval(() => {}, 1000);
}

main().catch(err => {
    logger.error({ err }, '[WatchdogWorker] Critical startup failure');
    process.exit(1);
});
