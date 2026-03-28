import { initInstrumentation } from '@packages/observability';
import app from './app';
import { createServer } from 'http';
import { initWebSocket } from './services/websocket';

initInstrumentation('multiagent-api');

const server = createServer(app);
initWebSocket(server);

const PORT = parseInt(process.env.PORT || '3001', 10);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[API] Server running on port ${PORT}`);
});
