export * from './frontend.js';
export * from './backend.js';
export * from './env.js';
export { SecretProvider } from './secret-provider.js';

import { serverConfig } from './backend.js';
import { env } from './env.js';


/**
 * Standard named exports for convenience.
 * Consumers should prefer 'serverConfig' or 'frontendConfig'
 * but we keep 'config' as an alias for the server config for backward compatibility.
 */
export const config = serverConfig;

export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = env.NODE_ENV === 'development';