import 'dotenv/config';
import { SecretProvider } from '@packages/config';
import { logger } from '@packages/observability';

process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL: Uncaught Exception in Auth Service:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('🔥 CRITICAL: Unhandled Rejection in Auth Service:', reason);
});

async function main() {
    console.log(`[AuthService] Bootstrapping...`);
    await SecretProvider.bootstrap();

    const { startAuthServer } = await import('./server');
    console.log(`[AuthService] Starting server...`);
    await startAuthServer();
}

main().catch(err => {
    console.error('[AuthService] Fatal startup error:', err);
    process.exit(1);
});
