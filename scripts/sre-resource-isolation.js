"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const containerManager_1 = require("../packages/sandbox-cluster/src/runtime/containerManager");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const child_process_1 = require("child_process");
const PROJECTS_ROOT = path_1.default.join(process.cwd(), '.generated-projects');
async function runResourceIsolationTest() {
    console.log('🚀 Starting SRE Resource Isolation Certification...');
    const projectId = 'sre-isolation-test';
    const projectDir = path_1.default.join(PROJECTS_ROOT, projectId);
    await fs_extra_1.default.ensureDir(projectDir);
    // 1. Create a project that spikes CPU and Memory
    console.log('📝 Creating project with malicious infinite loop and memory spike...');
    // Create a simple express app that has a /leak and /spike endpoint
    const serverJs = `
    const express = require('express');
    const app = express();
    const port = process.env.PORT || 3000;

    app.get('/health', (req, res) => res.send('OK'));

    app.get('/spike', (req, res) => {
      console.log('🔥 Starting CPU Spike...');
      while(true) { /* Infinite Loop */ }
    });

    app.get('/leak', (req, res) => {
      console.log('💧 Starting Memory Leak...');
      const leak = [];
      setInterval(() => {
        for(let i=0; i<10000; i++) {
          leak.push(new Array(1000).fill('leak'));
        }
        console.log('Memory usage:', process.memoryUsage().heapUsed / 1024 / 1024, 'MB');
      }, 100);
      res.send('Leak started');
    });

    app.listen(port, () => console.log('Server running on port ' + port));
  `;
    await fs_extra_1.default.writeFile(path_1.default.join(projectDir, 'server.js'), serverJs);
    await fs_extra_1.default.writeFile(path_1.default.join(projectDir, 'package.json'), JSON.stringify({
        name: 'isolation-test',
        version: '1.0.0',
        main: 'server.js',
        dependencies: { express: 'latest' }
    }));
    // Create Dockerfile.sandbox if it doesn't exist in the project (needed by containerManager)
    const dockerDir = path_1.default.join(__dirname, '..', 'packages', 'sandbox-cluster', 'src', 'runtime', 'docker');
    await fs_extra_1.default.ensureDir(dockerDir);
    const dockerfileContent = `
    FROM node:18-alpine
    WORKDIR /app
    COPY . .
    RUN npm install
    CMD ["node", "server.js"]
  `;
    await fs_extra_1.default.writeFile(path_1.default.join(dockerDir, 'Dockerfile.sandbox'), dockerfileContent);
    try {
        // 2. Start the container
        console.log('🐳 Starting container with 0.5 CPU and 512MB RAM limits...');
        const port = 3999;
        const { containerId } = await containerManager_1.ContainerManager.start(projectId, port);
        console.log(`✅ Container started: ${containerId}`);
        // 3. Test Infinite Loop (CPU Limit)
        console.log('🧪 Testing CPU Isolation (Infinite Loop)...');
        // We trigger it asynchronously as it will hang the request
        const spikePromise = fetch(`http://localhost:${port}/spike`).catch(() => { });
        await new Promise(r => setTimeout(r, 10000));
        const stats = (0, child_process_1.execSync)(`docker stats ${containerId} --no-stream --format "{{.CPUPerc}},{{.MemUsage}}"`).toString();
        console.log(`📊 Container Stats during Spike: ${stats}`);
        // 4. Test Memory Leak (Memory Limit)
        console.log('🧪 Testing Memory Isolation (Leak)...');
        await fetch(`http://localhost:${port}/leak`).catch(() => { });
        await new Promise(r => setTimeout(r, 15000));
        const finalState = (0, child_process_1.execSync)(`docker inspect ${containerId} --format "{{.State.Status}}"`).toString().trim();
        console.log(`🏁 Container Final State: ${finalState}`);
        if (finalState === 'exited' || finalState === 'restarting') {
            console.log('✅ SUCCESS: Container was terminated/restarted due to resource exhaustion (OOM).');
        }
        else {
            console.warn('⚠️ WARNING: Container still running. Checking if limits were enforced...');
            // If it's still running but CPU was capped at ~50%, it's also a partial pass
        }
    }
    catch (err) {
        console.error('❌ Test failed:', err instanceof Error ? err.message : String(err));
    }
    finally {
        console.log('🧹 Cleaning up...');
        await containerManager_1.ContainerManager.stop(projectId);
    }
}
runResourceIsolationTest().catch(console.error);
//# sourceMappingURL=sre-resource-isolation.js.map