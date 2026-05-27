import crypto from 'node:crypto';

export interface SecurityContext {
    tenantId: string;
    roles: string[];
    allowedNamespaces: string[];
}

export interface NamespaceConfig {
    namespace: string;
    allowedWorkflows: string[];
    maxConcurrentWorkflows: number;
    rateLimitRequestsPerMin: number;
    allowedSideEffects?: string[];
}

export class RateLimiter {
    private tokens: number;
    private lastRefill: number;

    constructor(private readonly limitPerMin: number) {
        this.tokens = limitPerMin;
        this.lastRefill = Date.now();
    }

    public allow(): boolean {
        const now = Date.now();
        const elapsedMs = now - this.lastRefill;
        this.lastRefill = now;

        const refill = (elapsedMs / 60000) * this.limitPerMin;
        this.tokens = Math.min(this.limitPerMin, this.tokens + refill);

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

export class TenantManager {
    private configs = new Map<string, NamespaceConfig>();
    private rateLimiters = new Map<string, RateLimiter>();
    private activeCounts = new Map<string, number>();

    public registerNamespace(config: NamespaceConfig): void {
        this.configs.set(config.namespace, config);
        this.rateLimiters.set(config.namespace, new RateLimiter(config.rateLimitRequestsPerMin));
        this.activeCounts.set(config.namespace, 0);
    }

    public checkQuotaAndRateLimit(namespace: string, workflowName: string, secCtx: SecurityContext): void {
        const config = this.configs.get(namespace);
        if (!config) {
            throw new Error(`[SECURITY] Namespace ${namespace} not registered`);
        }

        // 1. Authorization check: SecurityContext must have access to namespace
        if (!secCtx.allowedNamespaces.includes(namespace) && !secCtx.roles.includes('admin')) {
            throw new Error(`[SECURITY] Access denied to namespace ${namespace}`);
        }

        // 2. Workflow authorization: Check if workflow is allowed in namespace
        if (!config.allowedWorkflows.includes(workflowName)) {
            throw new Error(`[SECURITY] Workflow ${workflowName} is not allowed in namespace ${namespace}`);
        }

        // 3. Rate limiting
        const limiter = this.rateLimiters.get(namespace);
        if (limiter && !limiter.allow()) {
            throw new Error(`[SECURITY] Rate limit exceeded for namespace ${namespace}`);
        }

        // 4. Concurrent quotas
        const activeCount = this.activeCounts.get(namespace) || 0;
        if (activeCount >= config.maxConcurrentWorkflows) {
            throw new Error(`[SECURITY] Concurrent workflow execution quota exceeded for namespace ${namespace}`);
        }
    }

    public incrementActive(namespace: string): void {
        const current = this.activeCounts.get(namespace) || 0;
        this.activeCounts.set(namespace, current + 1);
    }

    public decrementActive(namespace: string): void {
        const current = this.activeCounts.get(namespace) || 0;
        this.activeCounts.set(namespace, Math.max(0, current - 1));
    }

    public getConfig(namespace: string): NamespaceConfig | undefined {
        return this.configs.get(namespace);
    }

    public getTenantUsage(): Record<string, { activeCount: number; maxConcurrentWorkflows: number; rateLimitRequestsPerMin: number }> {
        const usage: Record<string, { activeCount: number; maxConcurrentWorkflows: number; rateLimitRequestsPerMin: number }> = {};
        for (const [namespace, config] of this.configs.entries()) {
            usage[namespace] = {
                activeCount: this.activeCounts.get(namespace) || 0,
                maxConcurrentWorkflows: config.maxConcurrentWorkflows,
                rateLimitRequestsPerMin: config.rateLimitRequestsPerMin
            };
        }
        return usage;
    }
}

export interface SignedWorkflowPackage {
    workflowName: string;
    codeHash: string;
    signature: string;
}

export class SecureWorkflowPackager {
    public static signPackage(
        workflowName: string,
        wasmBytes: Uint8Array,
        privateKeyPem: string
    ): SignedWorkflowPackage {
        const codeHash = crypto.createHash('sha256').update(wasmBytes).digest('hex');
        const sign = crypto.createSign('SHA256');
        sign.update(codeHash);
        const signature = sign.sign(privateKeyPem, 'base64');

        return {
            workflowName,
            codeHash,
            signature
        };
    }

    public static verifyPackage(
        pkg: SignedWorkflowPackage,
        wasmBytes: Uint8Array,
        publicKeyPem: string
    ): boolean {
        const computedHash = crypto.createHash('sha256').update(wasmBytes).digest('hex');
        if (computedHash !== pkg.codeHash) return false;

        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(pkg.codeHash);
            return verify.verify(publicKeyPem, pkg.signature, 'base64');
        } catch {
            return false;
        }
    }
}

export class ClusterAuthManager {
    constructor(private readonly clusterSecret: string) {}

    public authenticateNode(token: string): boolean {
        return token === this.clusterSecret;
    }

    public generateToken(): string {
        return this.clusterSecret;
    }
}
