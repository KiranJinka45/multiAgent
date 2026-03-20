import http from 'http';

/**
 * Stubbed Collaboration server to ensure API boot stability.
 */
export function startCollaborationServer(port: number = 3011) {
    const server = http.createServer((request, response) => {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('MultiAgent Yjs Stub (Recovery Mode)\n');
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`[YJS-Stub] Server running on port ${port} (Collaboration disabled for recovery)`);
    });

    return server;
}
