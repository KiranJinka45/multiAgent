"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GIT WORKER SERVICE
 * Synchronizes local project snapshots with the distributed git authority.
 */
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const git_1 = require("./services/git");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
/**
 * Git Worker: Listens for Git-related requests from the IDE API
 * and executes them against the local project directories.
 */
async function startGitWorker() {
    observability_1.logger.info('[Git-Worker] Starting and subscribing to git-events...');
    // 1. Subscribe using dedicated subscriber singleton
    utils_1.subscriber.psubscribe('git:commit:*', (err) => {
        if (err)
            observability_1.logger.error({ err }, '[Git-Worker] Subscription Error');
    });
    utils_1.subscriber.on('pmessage', async (pattern, channel, message) => {
        const projectId = channel.split(':')[2];
        if (!projectId)
            return;
        try {
            const { message: commitMessage } = JSON.parse(message);
            // Project path resolution (adjust based on actual deployment structure)
            const projectPath = path_1.default.join(process.cwd(), '.generated-projects', projectId);
            if (!await fs_extra_1.default.pathExists(projectPath)) {
                observability_1.logger.warn(`[Git-Worker] Project path not found: ${projectPath}`);
                return;
            }
            const gitService = new git_1.GitService(projectPath);
            await gitService.init();
            if (pattern.includes('commit')) {
                observability_1.logger.info({ projectId }, `[Git-Worker] Handling commit for ${projectId}`);
                await gitService.commit(commitMessage || 'Manual IDE Snapshot');
                // 2. Broadcast updated history using global redis singleton
                const history = await gitService.getHistory();
                await utils_1.redis.set(`git:history:${projectId}`, JSON.stringify(history));
                observability_1.logger.info({ projectId }, `[Git-Worker] History updated for ${projectId}`);
            }
        }
        catch (error) {
            observability_1.logger.error({ projectId, error }, '[Git-Worker] Processing Error');
        }
    });
}
startGitWorker().catch(err => observability_1.logger.error({ err }, '[Git-Worker] Fatal Startup Error'));
//# sourceMappingURL=git-worker.js.map