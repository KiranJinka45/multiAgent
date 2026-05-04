import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

/**
 * Git versioning service for project codebases.
 * Handles initialized repositories, committing changes, and retrieving history.
 */
export class GitService {
  private git: SimpleGit;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    const options: Partial<SimpleGitOptions> = {
      baseDir: projectPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
    };
    this.git = simpleGit(options);
  }

  /**
   * Initializes a new git repository if it doesn't exist.
   */
  async init() {
    try {
      if (!await fs.pathExists(path.join(this.projectPath, '.git'))) {
        await this.git.init();
        console.log(`[GitService] Initialized repository at ${this.projectPath}`);
      }
    } catch (err) {
      console.error(`[GitService] Init failure:`, err);
    }
  }

  /**
   * Commits all changes in the project with a message.
   */
  async commit(message: string) {
    try {
      await this.git.add('.');
      const summary = await this.git.commit(message);
      console.log(`[GitService] Committed changes: ${message}`);
      return summary;
    } catch (err) {
      console.error(`[GitService] Commit failure:`, err);
      throw err;
    }
  }

  /**
   * Retrieves the commit log history for the project.
   */
  async getHistory() {
    try {
      const log = await this.git.log();
      return log.all;
    } catch (err) {
      console.error(`[GitService] History retrieval failure:`, err);
      return [];
    }
  }

  /**
   * Reverts the project state to a specific commit hash.
   */
  async revert(hash: string) {
    try {
      await this.git.checkout(hash);
      console.log(`[GitService] Reverted to commit: ${hash}`);
    } catch (err) {
      console.error(`[GitService] Revert failure:`, err);
      throw err;
    }
  }
}

/**
 * Convenience function to snapshot a project.
 */
export async function snapshotProject(projectPath: string, message: string) {
  const service = new GitService(projectPath);
  await service.init();
  return await service.commit(message);
}

