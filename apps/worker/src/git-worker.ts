/**
 * GIT WORKER SERVICE
 * Synchronizes local project snapshots with the distributed git authority.
 */
import { redis, subscriber } from '@packages/utils';
import { logger } from '@packages/observability';
import { GitService } from './services/git';
import path from 'path';
import fs from 'fs-extra';

/**
 * Git Worker: Listens for Git-related requests from the IDE API
 * and executes them against the local project directories.
 */
async function startGitWorker() {
    logger.info('[Git-Worker] Starting and subscribing to git-events...');

    // 1. Subscribe using dedicated subscriber singleton
    subscriber.psubscribe('git:commit:*', (err?: any) => {
        if (err) logger.error({ err }, '[Git-Worker] Subscription Error');
    });

    subscriber.on('pmessage', async (pattern: string, channel: string, message: string) => {
        const projectId = channel.split(':')[2];
        if (!projectId) return;

        try {
            const { message: commitMessage } = JSON.parse(message);
            // Project path resolution (adjust based on actual deployment structure)
            const projectPath = path.join(process.cwd(), '.generated-projects', projectId);

            if (!await fs.pathExists(projectPath)) {
                logger.warn(`[Git-Worker] Project path not found: ${projectPath}`);
                return;
            }

            const gitService = new GitService(projectPath);
            await gitService.init();

            if (pattern.includes('commit')) {
                logger.info({ projectId }, `[Git-Worker] Handling commit for ${projectId}`);
                await gitService.commit(commitMessage || 'Manual IDE Snapshot');

                // 2. Broadcast updated history using global redis singleton
                const history = await gitService.getHistory();
                await redis.set(`git:history:${projectId}`, JSON.stringify(history));
                logger.info({ projectId }, `[Git-Worker] History updated for ${projectId}`);
            }
        } catch (error) {
            logger.error({ projectId, error }, '[Git-Worker] Processing Error');
        }
    });
}

startGitWorker().catch(err => logger.error({ err }, '[Git-Worker] Fatal Startup Error'));
