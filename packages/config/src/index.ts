export * from './frontend';
export * from './backend';
export * from './env';
export { SecretProvider } from './secret-provider';

import { serverConfig } from './backend';
import { env } from './env';

/**
 * Standard named exports for convenience.
 * Consumers should prefer 'serverConfig' or 'frontendConfig'
 * but we keep 'config' as an alias for the server config for backward compatibility.
 */
export const config = serverConfig;

export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = env.NODE_ENV === 'development';