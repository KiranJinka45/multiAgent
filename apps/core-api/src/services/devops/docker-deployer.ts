import Docker from 'dockerode';
import path from 'path';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import logger from '@packages/utils';

const docker = new Docker(); // Connects to local Docker daemon

export class DockerDeployer {
    async deploy(projectId: string, files: { path: string, content: string }[], sandboxDir: string): Promise<string> {
        try {
            logger.info({ projectId }, '[DockerDeployer] Starting containerization...');

            // 1. Ensure sandbox dir exists
            if (!fsSync.existsSync(sandboxDir)) {
                await fs.mkdir(sandboxDir, { recursive: true });
            }

            // 2. Write files (including Next.js/Vite config and package.json)
            for (const file of files) {
                const fullPath = path.join(sandboxDir, file.path);
                const dir = path.dirname(fullPath);
                if (!fsSync.existsSync(dir)) await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(fullPath, file.content);
            }

            // 3. Create Dockerfile if it doesn't exist
            const dockerfilePath = path.join(sandboxDir, 'Dockerfile');
            if (!fsSync.existsSync(dockerfilePath)) {
                // Determine if Next.js or Vite based on package.json
                const pkgJsonPath = path.join(sandboxDir, 'package.json');
                let isNextJs = false;
                if (fsSync.existsSync(pkgJsonPath)) {
                    const pkgContent = await fs.readFile(pkgJsonPath, 'utf-8');
                    const pkg = JSON.parse(pkgContent);
                    if (pkg.dependencies?.next) isNextJs = true;
                }
                
                // --- HARDENED DOCKERFILE ---
                let dockerfileContent = '';
                if (isNextJs) {
                    dockerfileContent = `
FROM node:18-alpine AS base
RUN addgroup -S runner && adduser -S runner -G runner
WORKDIR /app
COPY --chown=runner:runner package*.json ./
RUN npm ci
COPY --chown=runner:runner . .
RUN npm run build
USER runner
EXPOSE 3000
CMD ["npm", "start"]
                    `;
                } else {
                    dockerfileContent = `
FROM node:18-alpine AS build
RUN addgroup -S runner && adduser -S runner -G runner
WORKDIR /app
COPY --chown=runner:runner package*.json ./
RUN npm install
COPY --chown=runner:runner . .
RUN npm run build

FROM nginx:alpine
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
COPY --from=build /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
                    `;
                }
                await fs.writeFile(dockerfilePath, dockerfileContent.trim());
            }

            // 4. Build Docker Image
            const imageName = `multiagent-project-${projectId.toLowerCase()}`;
            logger.info({ imageName }, '[DockerDeployer] Building Docker image...');
            const stream = await docker.buildImage({
                context: sandboxDir,
                src: await fs.readdir(sandboxDir)
            }, { t: imageName });

            await new Promise((resolve, reject) => {
                docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
            });

            // 5. Run Container
            const containerName = `container-${projectId}`;

            // Remove existing container if any
            try {
                const existing = docker.getContainer(containerName);
                await existing.stop();
                await existing.remove();
            } catch (e) { /* ignore */ }

            // Find an open port (simplified: pick random 8000-9000)
            const port = Math.floor(Math.random() * (9000 - 8000 + 1)) + 8000;

            logger.info({ containerName, port }, '[DockerDeployer] Starting hardened container...');
            const container = await docker.createContainer({
                Image: imageName,
                name: containerName,
                HostConfig: {
                    PortBindings: {
                        '3000/tcp': [{ HostPort: port.toString() }],
                        '80/tcp': [{ HostPort: port.toString() }]
                    },
                    // --- ZERO-TRUST HARDENING ---
                    Memory: 512 * 1024 * 1024,      // 512MB Limit
                    MemorySwap: 512 * 1024 * 1024,  // No Swap
                    NanoCpus: 500000000,            // 0.5 CPU Limit
                    ReadonlyRootfs: true,           // Immutable FS
                    CapDrop: ['ALL'],               // Drop all capabilities
                    SecurityOpt: ['no-new-privileges'], 
                    Runtime: process.env.DOCKER_RUNTIME || 'runc' // 'gvisor' in prod
                },
                // NetworkDisabled: true, // Optional: Block internet if only internal
            });

            await container.start();

            const liveUrl = `http://localhost:${port}`;
            logger.info({ liveUrl }, '[DockerDeployer] Container deployed successfully!');
            return liveUrl;

        } catch (error) {
            logger.error({ error, projectId }, '[DockerDeployer] Deployment failed.');
            throw error;
        }
    }
}

