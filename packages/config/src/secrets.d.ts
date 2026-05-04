export interface SecretStore {
    name: string;
    get(key: string): Promise<string | undefined>;
}
/**
 * Local environment based secret store (Fallback)
 */
export declare class EnvSecretStore implements SecretStore {
    name: string;
    get(key: string): Promise<string | undefined>;
}
/**
 * File-based secret store (Docker Secrets / K8s Mounts)
 */
export declare class FileSecretStore implements SecretStore {
    name: string;
    get(key: string): Promise<string | undefined>;
}
/**
 * Mock Vault/Cloud Provider Store
 */
export declare class CloudSecretStore implements SecretStore {
    name: string;
    get(key: string): Promise<string | undefined>;
}
export declare class MultiSecretProvider {
    private static stores;
    private static cache;
    static fetch(key: string): Promise<string>;
    static getSync(key: string): string;
}
//# sourceMappingURL=secrets.d.ts.map