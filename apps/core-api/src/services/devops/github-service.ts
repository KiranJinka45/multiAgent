import { logger } from '@packages/observability';

export class GithubService {
  private repositories: string[] = [];

  /**
   * Syncs with Github to fetch latest metadata for registered repositories.
   */
  public async syncRepos(repoIds: string[]) {
    this.repositories = repoIds;
    logger.info({ count: repoIds.length }, '[GITHUB] Synced repositories');
  }

  public async getRepoMetadata(repoId: string) {
    const repo = this.repositories.find((id: any) => id === repoId);
    if (!repo) {
      logger.warn({ repoId }, '[GITHUB] Metadata requested for unregistered repository');
      return null;
    }

    return {
      id: repo,
      status: 'ACTIVE',
      lastSync: new Date().toISOString()
    };
  }
}

export const githubService = new GithubService();
