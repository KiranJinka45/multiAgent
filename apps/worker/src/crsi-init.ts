import { db } from '@libs/db';
import * as fs from 'fs';
import * as path from 'path';

class CodeIndexer {
  private rootDir: string;
  private ignoreDirs = ['node_modules', '.git', 'dist', '.next', 'out'];

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async scan() {
    console.log(`[CodeIndexer] Scanning ${this.rootDir}...`);
    await this.walk(this.rootDir);
  }

  private async walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!this.ignoreDirs.includes(file)) await this.walk(fullPath);
      } else if (file.match(/\.(ts|js|prisma|json|md)$/)) {
        await this.indexFile(fullPath);
      }
    }
  }

  private async indexFile(filePath: string) {
    const relativePath = path.relative(this.rootDir, filePath).replace(/\\/g, '/');
    const name = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    let riskLevel = 'low';
    if (relativePath.includes('auth') || relativePath.includes('db') || relativePath.includes('orchestrator')) riskLevel = 'high';
    else if (relativePath.includes('worker') || relativePath.includes('brain')) riskLevel = 'medium';

    await db.codeModule.upsert({
      where: { path: relativePath },
      update: { name, summary: content.substring(0, 100), riskLevel, lastUpdated: new Date() },
      create: { path: relativePath, name, summary: content.substring(0, 100), riskLevel, lastUpdated: new Date() }
    });
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '../../../');
  const indexer = new CodeIndexer(rootDir);
  await indexer.scan();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
