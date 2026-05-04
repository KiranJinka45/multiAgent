"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiSecretProvider = exports.CloudSecretStore = exports.FileSecretStore = exports.EnvSecretStore = void 0;
const env_1 = require("./env");
/**
 * Local environment based secret store (Fallback)
 */
class EnvSecretStore {
    constructor() {
        this.name = 'env';
    }
    async get(key) {
        return process.env[key];
    }
}
exports.EnvSecretStore = EnvSecretStore;
/**
 * File-based secret store (Docker Secrets / K8s Mounts)
 */
class FileSecretStore {
    constructor() {
        this.name = 'file';
    }
    async get(key) {
        // Check common secret mount paths (/run/secrets or /etc/secrets)
        return undefined; // TODO: Implement if needed
    }
}
exports.FileSecretStore = FileSecretStore;
/**
 * Mock Vault/Cloud Provider Store
 */
class CloudSecretStore {
    constructor() {
        this.name = 'cloud';
    }
    async get(key) {
        // Placeholder for real Hashicorp Vault or GCP Secret Manager integration
        return undefined;
    }
}
exports.CloudSecretStore = CloudSecretStore;
class MultiSecretProvider {
    static async fetch(key) {
        if (this.cache.has(key))
            return this.cache.get(key);
        for (const store of this.stores) {
            const value = await store.get(key);
            if (value) {
                if (env_1.env.NODE_ENV === 'production' && store.name === 'env') {
                    console.warn(`[SecretProvider] WARNING: Fetching secret "${key}" from insecure ENV in production.`);
                }
                this.cache.set(key, value);
                return value;
            }
        }
        throw new Error(`[SecretProvider] CRITICAL: Secret "${key}" not found in any store.`);
    }
    static getSync(key) {
        const value = this.cache.get(key);
        if (!value) {
            // Fallback to direct env access for sync calls (legacy/bootstrap)
            const envValue = process.env[key];
            if (envValue)
                return envValue;
            throw new Error(`[SecretProvider] CRITICAL: Secret "${key}" not initialized and not in ENV.`);
        }
        return value;
    }
}
exports.MultiSecretProvider = MultiSecretProvider;
MultiSecretProvider.stores = [
    new CloudSecretStore(),
    new FileSecretStore(),
    new EnvSecretStore(),
];
MultiSecretProvider.cache = new Map();
//# sourceMappingURL=secrets.js.map