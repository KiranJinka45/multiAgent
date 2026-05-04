import { db } from '@packages/db';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@packages/observability';

export class CodeIndexer {
  private rootDir: string;
  private ignoreDirs = ['node_modules', '.git', 'dist', '.next', 'out'];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async scan() {
    logger.info({ rootDir: this.rootDir }, '[CodeIndexer] Starting codebase scan...');
    await this.walk(this.rootDir);
    logger.info('[CodeIndexer] Codebase scan complete.');
  }

  private async walk(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!this.ignoreDirs.includes(file)) {
          await this.walk(fullPath);
        }
      } else if (file.match(/\.(ts|js|prisma|json|md)$/)) {
        await this.indexFile(fullPath);
      }
    }
  }

  private async indexFile(filePath: string) {
    const relativePath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
    const name = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Basic heuristic for risk and summary
    let riskLevel = 'low';
    if (relativePath.includes('auth') || relativePath.includes('db') || relativePath.includes('orchestrator') || relativePath.includes('gateway')) {
      riskLevel = 'high';
    } else if (relativePath.includes('worker') || relativePath.includes('brain')) {
      riskLevel = 'medium';
    }

    const summary = this.generateSummary(name, content);

    await db.codeModule.upsert({
      where: { path: relativePath },
      update: {
        name,
        summary,
        riskLevel,
        lastUpdated: new Date()
      },
      create: {
        path: relativePath,
        name,
        summary,
        riskLevel,
        lastUpdated: new Date()
      }
    });
  }

  private generateSummary(name: string, content: string): string {
    // In a real system, this would be an LLM-generated summary.
    // For now, we extract the first few descriptive lines or use a generic summary.
    const firstLines = content.split('\n').slice(0, 5).join(' ').substring(0, 200);
    return `Module ${name}. Start: ${firstLines}`;
  }
}




