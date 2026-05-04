import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { onShutdown } from "@packages/utils";
import { env } from "@packages/config";
import { logger } from "@packages/observability";

const PORT = env.CORE_API_PORT || 8081;
const HOST = "0.0.0.0";


/**
 * DETERMINISTIC LIFECYCLE V16.0
 * Separates the Express application from the HTTP server instance.
 * Ensures Socket.IO is attached once to a stable server.
 */
async function bootstrap() {
    // 0. Initialize Secrets
    const { SecretProvider } = await import('@packages/config');
    await SecretProvider.bootstrap();

    const server = http.createServer(app);

    // Initialize modular Socket.IO
    initSocket(server);

    server.listen(PORT, HOST, () => {
        console.log(`[Lifecycle] SERVER BOOTING ON PORT: ${PORT}`);
        logger.info({ host: HOST, port: PORT }, '🚀 [API] MultiAgent Mesh Active');

        // Register Graceful Shutdown
        onShutdown('API Server', () => new Promise(resolve => server.close(() => resolve())));
    });
}

// EXECUTE BOOTSTRAP
bootstrap();

