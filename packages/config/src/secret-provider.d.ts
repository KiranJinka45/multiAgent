export declare class SecretProvider {
    /**
     * Fetches secrets from AWS Secrets Manager and populates process.env.
     * This should be called at the very beginning of the service lifecycle.
     */
    static bootstrap(): Promise<void>;
    /**
     * Validates that all required secrets have been loaded.
     * This is called after bootstrap() or when the system is initialized.
     */
    static validate(): void;
    /**
     * Retrieves a secret value from process.env.
     */
    static get(key: string): string | undefined;
}
//# sourceMappingURL=secret-provider.d.ts.map