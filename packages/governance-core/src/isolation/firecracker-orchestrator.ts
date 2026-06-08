export interface VmConfiguration {
    vmId: string;
    kernelImagePath: string;
    rootfsPath: string;
    memorySizeMb: number;
    vcpuCount: number;
}

export interface FirecrackerAdapter {
    spawnVm(config: VmConfiguration): Promise<void>;
    killVm(vmId: string): Promise<void>;
    executeCommand(vmId: string, command: string): Promise<string>;
}

export class MockFirecrackerAdapter implements FirecrackerAdapter {
    private runningVms = new Set<string>();

    async spawnVm(config: VmConfiguration): Promise<void> {
        console.log(`[FIRECRACKER_MOCK] Spawning VM ${config.vmId} with ${config.memorySizeMb}MB RAM, ${config.vcpuCount} vCPUs.`);
        this.runningVms.add(config.vmId);
    }

    async killVm(vmId: string): Promise<void> {
        if (!this.runningVms.has(vmId)) {
            console.warn(`[FIRECRACKER_MOCK] Attempted to kill non-existent or already dead VM: ${vmId}`);
            return;
        }
        console.log(`[FIRECRACKER_MOCK] Hard-killing VM ${vmId}.`);
        this.runningVms.delete(vmId);
    }

    async executeCommand(vmId: string, command: string): Promise<string> {
        if (!this.runningVms.has(vmId)) {
            throw new Error(`[FIRECRACKER_MOCK] Cannot execute command in dead VM: ${vmId}`);
        }
        return `Mock output for command: ${command}`;
    }

    isVmRunning(vmId: string): boolean {
        return this.runningVms.has(vmId);
    }
}

export class FirecrackerOrchestrator {
    private adapter: FirecrackerAdapter;

    constructor(adapter: FirecrackerAdapter = new MockFirecrackerAdapter()) {
        if (adapter instanceof MockFirecrackerAdapter && process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_FIRECRACKER !== 'true') {
            throw new Error('[SECURITY_VIOLATION] MockFirecrackerAdapter must not be used as a default or fallback in production mode (OPS-MAINT-OBS-01).');
        }
        this.adapter = adapter;
    }

    async startIsolationSandbox(config: VmConfiguration): Promise<void> {
        await this.adapter.spawnVm(config);
    }

    async destroyIsolationSandbox(vmId: string): Promise<void> {
        await this.adapter.killVm(vmId);
    }

    async run(vmId: string, command: string): Promise<string> {
        return await this.adapter.executeCommand(vmId, command);
    }
}
