import fs from 'fs/promises';
import path from 'path';
import { logger } from '@libs/observability';

export class CICDManager {
    /**
     * Generates standard CI/CD pipeline configurations for the project.
     */
    static async setupPipeline(projectId: string, projectDir: string, framework: string = 'nextjs'): Promise<string[]> {
        logger.info({ projectId }, '[CICDManager] Generating CI/CD pipelines...');

        const workflowsDir = path.join(projectDir, '.github', 'workflows');
        const generatedFiles: string[] = [];

        try {
            await fs.mkdir(workflowsDir, { recursive: true });

            // 1. Main CI/CD Workflow
            const mainWorkflow = this.generateMainWorkflow(framework);
            const mainPath = path.join(workflowsDir, 'deploy.yml');
            await fs.writeFile(mainPath, mainWorkflow);
            generatedFiles.push('.github/workflows/deploy.yml');

            // 2. Lint & Test Workflow
            const testWorkflow = this.generateTestWorkflow();
            const testPath = path.join(workflowsDir, 'test.yml');
            await fs.writeFile(testPath, testWorkflow);
            generatedFiles.push('.github/workflows/test.yml');

            logger.info({ projectId, fileCount: generatedFiles.length }, '[CICDManager] CI/CD pipelines generated.');
            return generatedFiles;
        } catch (e) {
            logger.error({ projectId, error: e }, '[CICDManager] Failed to setup pipelines');
            return [];
        }
    }

    private static generateMainWorkflow(framework: string): string {
        return `name: Production Deployment

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build project
        run: npm run build
      - name: Deploy to Antigravity Cloud
        run: npx antigravity-cli deploy --token \${{ secrets.ANTIGRAVITY_TOKEN }}
`;
    }

    private static generateTestWorkflow(): string {
        return `name: Quality Assurance

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run Linter
        run: npm run lint
      - name: Run Tests
        run: npm test
`;
    }
}
