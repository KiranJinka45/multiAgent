export * from './frontend';
export * from './backend';
export * from './env';
export { SecretProvider } from './secret-provider';
/**
 * Standard named exports for convenience.
 * Consumers should prefer 'serverConfig' or 'frontendConfig'
 * but we keep 'config' as an alias for the server config for backward compatibility.
 */
export declare const config: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DATABASE_URL: string | undefined;
    REDIS_URL: string | undefined;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    CORE_ENGINE_URL: string;
    PREVIEW_URL: string;
    databaseUrl: string | undefined;
    supabaseServiceKey: string | undefined;
};
export declare const IS_PRODUCTION: boolean;
export declare const IS_DEVELOPMENT: boolean;
//# sourceMappingURL=index.d.ts.map