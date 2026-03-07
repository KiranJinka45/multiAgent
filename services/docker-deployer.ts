import Docker from 'dockerode';
import path from 'path';
import fs from 'fs';
import logger from '@configs/logger';

const docker = new Docker(); // Connects to local Docker daemon

export class DockerDeployer {
    async deploy(projectId: string, files: { path: string, content: string }[], sandboxDir: string): Promise<string> {
        try {
            logger.info({ projectId }, '[DockerDeployer] Starting containerization...');

            // 1. Ensure sandbox dir exists
            if (!fs.existsSync(sandboxDir)) {
                fs.mkdirSync(sandboxDir, { recursive: true });
            }

            // 2. Write files (including Next.js/Vite config and package.json)
            for (const file of files) {
                const fullPath = path.join(sandboxDir, file.path);
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(fullPath, file.content);
            }

            // 3. Create Dockerfile if it doesn't exist
            const dockerfilePath = path.join(sandboxDir, 'Dockerfile');
            if (!fs.existsSync(dockerfilePath)) {
                // Determine if Next.js or Vite based on package.json
                const pkgJsonPath = path.join(sandboxDir, 'package.json');
                let isNextJs = false;
                if (fs.existsSync(pkgJsonPath)) {
                    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                    if (pkg.dependencies?.next) isNextJs = true;
                }

                let dockerfileContent = '';
                if (isNextJs) {
                    dockerfileContent = `
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
                    `;
                } else {
                    // Generic static / Vite
                    dockerfileContent = `
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
                    `;
                }
                fs.writeFileSync(dockerfilePath, dockerfileContent.trim());
            }

            // 4. Build Docker Image
            const imageName = `multiagent-project-${projectId.toLowerCase()}`;
            logger.info({ imageName }, '[DockerDeployer] Building Docker image...');
            const stream = await docker.buildImage({
                context: sandboxDir,
                src: fs.readdirSync(sandboxDir)
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

            logger.info({ containerName, port }, '[DockerDeployer] Starting container...');
            const container = await docker.createContainer({
                Image: imageName,
                name: containerName,
                HostConfig: {
                    PortBindings: {
                        '3000/tcp': [{ HostPort: port.toString() }],
                        '80/tcp': [{ HostPort: port.toString() }]
                    }
                }
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
