import { exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';

class PortAllocator {
    private basePort = 3001;
    private maxPort = 3999;
    private usedPorts = new Set<number>();

    async allocate(): Promise<number> {
        for (let port = this.basePort; port <= this.maxPort; port++) {
            if (this.usedPorts.has(port)) continue;

            const isAvailable = await this.checkPort(port);
            if (isAvailable) {
                this.usedPorts.add(port);
                return port;
            }
        }
        throw new Error('No available ports found for preview server');
    }

    release(port: number) {
        this.usedPorts.delete(port);
    }

    private checkPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.unref();
            server.on('error', () => resolve(false));
            server.listen(port, () => {
                server.close(() => resolve(true));
            });
        });
    }
}

export class PreviewServerManager {
    private portAllocator = new PortAllocator();
    private activePreviews = new Map<string, { port: number, process: ChildProcess }>();

    async launchPreview(projectId: string, files: any[]): Promise<string> {
        // Stop existing process if any
        if (this.activePreviews.has(projectId)) {
            await this.stopPreview(projectId);
        }

        const port = await this.portAllocator.allocate();
        const previewDir = path.join(process.cwd(), '.previews', projectId);

        // Write generated files to isolated directory
        if (!fs.existsSync(previewDir)) {
            fs.mkdirSync(previewDir, { recursive: true });
        }

        files.forEach(file => {
            const filePath = path.join(previewDir, file.path.replace(/^\//, ''));
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, file.content || '');
        });

        const { autoHealer } = require('./auto-healer');
        await autoHealer.healProject(projectId, previewDir);

        // Launch Next.js dev server or Vite based on package.json/files
        return new Promise((resolve, reject) => {
            try {
                // Determine start command (simplified simulation, assumes Next.js structure for now)
                const startCmd = `npx next dev -p ${port}`;

                const child = exec(startCmd, { cwd: previewDir });

                this.activePreviews.set(projectId, { port, process: child });

                // Allow some time for server to bind port
                setTimeout(() => {
                    resolve(`http://localhost:${port}`);
                }, 3000);

                child.on('error', (err) => {
                    console.error(`Preview server error [${projectId}]:`, err);
                    // auto-recovery or log could be handled here
                });

                child.on('exit', () => {
                    this.portAllocator.release(port);
                    this.activePreviews.delete(projectId);
                });

            } catch (err) {
                this.portAllocator.release(port);
                reject(err);
            }
        });
    }

    async stopPreview(projectId: string) {
        const preview = this.activePreviews.get(projectId);
        if (preview) {
            preview.process.kill('SIGKILL');
            this.portAllocator.release(preview.port);
            this.activePreviews.delete(projectId);
        }
    }
}

export const previewManager = new PreviewServerManager();
