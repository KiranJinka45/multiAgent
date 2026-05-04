/**
 * Backend/server-only configuration.
 * Do NOT import this from the frontend.
 */
export declare const serverConfig: {
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
//# sourceMappingURL=backend.d.ts.map