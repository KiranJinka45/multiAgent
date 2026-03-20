import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { previewManager } from './preview-manager';
import logger from '@config/logger';

/**
 * Preview Runtime Service
 * Bridges the gap between generated code and a live Next.js sandbox.
 * Prioritizes Docker for isolation, falls back to local process management.
 */
export async function startPreview(projectId: string, files: any[]): Promise<string> {
    const isDockerAvailable = await checkDocker();

    if (isDockerAvailable) {
        try {
            return await startDockerPreview(projectId, files);
        } catch (e) {
            logger.warn({ projectId, error: e }, '[PreviewRuntime] Docker launch failed, falling back to process-based preview');
            return await previewManager.launchPreview(projectId);
        }
    } else {
        logger.info({ projectId }, '[PreviewRuntime] Docker not detected, using process-based isolation');
        return await previewManager.launchPreview(projectId);
    }
}

async function checkDocker(): Promise<boolean> {
    return new Promise((resolve) => {
        exec('docker --version', (error) => {
            resolve(!error);
        });
    });
}

async function startDockerPreview(projectId: string, files: any[]): Promise<string> {
    const port = 4100 + Math.floor(Math.random() * 500);
    const projectPath = path.join(process.cwd(), '.previews', projectId);

    // Ensure files are written to host before mounting
    if (!fs.existsSync(projectPath)) fs.mkdirSync(projectPath, { recursive: true });
    files.forEach(file => {
        const filePath = path.join(projectPath, file.path.replace(/^\//, ''));
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, file.content || '');
    });

    // Docker command to run Next.js
    // Note: This uses node:20-slim for speed. It runs npm install if node_modules missing.
    const containerName = `preview-${projectId}`;
    const command = `docker run -d --rm \
        --name ${containerName} \
        -p ${port}:3000 \
        --memory=2g \
        --cpus=2 \
        -v "${projectPath}:/app" \
        -w /app \
        node:20-slim \
        sh -c "if [ ! -d 'node_modules' ]; then npm install; fi && npm run dev"`;

    return new Promise((resolve, reject) => {
        exec(command, (error) => {
            if (error) {
                reject(error);
                return;
            }
            logger.info({ projectId, port, containerName }, '[PreviewRuntime] Docker container started');
            resolve(`http://localhost:${port}`);
        });
    });
}

export async function stopPreview(projectId: string) {
    // Attempt Docker stop
    const containerName = `preview-${projectId}`;
    exec(`docker stop ${containerName}`, () => { });

    // Always stop process-based version too
    await previewManager.stopPreview(projectId);
}
