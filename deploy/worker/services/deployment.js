"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentService = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
/**
 * Deployment Service: Handles building Docker images and deploying to Kubernetes.
 */
class DeploymentService {
    projectPath;
    projectId;
    constructor(projectPath, projectId) {
        this.projectPath = projectPath;
        this.projectId = projectId;
    }
    async buildImage() {
        console.log(`[Deployment] Building Docker image for ${this.projectId}...`);
        // Ensure a basic Dockerfile exists
        const dockerfilePath = path_1.default.join(this.projectPath, 'Dockerfile');
        if (!await fs_extra_1.default.pathExists(dockerfilePath)) {
            await fs_extra_1.default.writeFile(dockerfilePath, `
                FROM node:18-alpine
                WORKDIR /app
                COPY package*.json ./
                RUN npm install
                COPY . .
                EXPOSE 3000
                CMD ["npm", "start"]
            `);
        }
        try {
            const output = (0, child_process_1.execSync)(`docker build -t app:${this.projectId} ${this.projectPath}`, { encoding: 'utf-8' });
            return output;
        }
        catch (error) {
            console.error('[Deployment] Build failed:', error);
            throw error;
        }
    }
    async deployPreview() {
        console.log(`[Deployment] Deploying preview for ${this.projectId}...`);
        // Mock K8s deployment logic
        // await k8s.createDeployment({...});
        const previewUrl = `https://${this.projectId}.preview.multiagent.app`;
        return previewUrl;
    }
    async promoteToProduction() {
        console.log(`[Deployment] Promoting ${this.projectId} to production...`);
        return { success: true, url: `https://${this.projectId}.multiagent.app` };
    }
}
exports.DeploymentService = DeploymentService;
//# sourceMappingURL=deployment.js.map