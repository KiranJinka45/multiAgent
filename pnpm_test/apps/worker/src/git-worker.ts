import Redis from 'ioredis';
import { GitService } from './services/git';
import path from 'path';
import fs from 'fs-extra';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Git Worker: Listens for Git-related requests from the IDE API
 * and executes them against the local project directories.
 */
async function startGitWorker() {
    console.log('[Git-Worker] Starting and subscribing to git-events...');

    // Subscribe to commit requested events
    redis.psubscribe('git:commit:*', (err) => {
        if (err) console.error('[Git-Worker] Subscription Error:', err);
    });

    redis.on('pmessage', async (pattern, channel, message) => {
        const projectId = channel.split(':')[2];
        if (!projectId) return;

        try {
            const { message: commitMessage } = JSON.parse(message);
            // Project path resolution (adjust based on actual deployment structure)
            const projectPath = path.join(process.cwd(), '.generated-projects', projectId);
            
            if (!await fs.pathExists(projectPath)) {
                console.warn(`[Git-Worker] Project path not found: ${projectPath}`);
                return;
            }

            const gitService = new GitService(projectPath);
            await gitService.init();
            
            if (pattern.includes('commit')) {
                console.log(`[Git-Worker] Handling commit for ${projectId}`);
                await gitService.commit(commitMessage || 'Manual IDE Snapshot');
                
                // Broadcast updated history
                const history = await gitService.getHistory();
                await pub.set(`git:history:${projectId}`, JSON.stringify(history));
                console.log(`[Git-Worker] History updated for ${projectId}`);
            }
        } catch (error) {
            console.error('[Git-Worker] Processing Error:', error);
        }
    });
}

startGitWorker().catch(console.error);
