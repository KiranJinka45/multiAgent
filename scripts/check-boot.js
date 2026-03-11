const net = require('net');
const Redis = require('ioredis');

async function checkPort(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, '127.0.0.1');
    });
}

async function run() {
    console.log('=== System Health Diagnostic ===');
    
    const redisReady = await checkPort(6379);
    console.log(`Redis (6379): ${redisReady ? 'ONLINE' : 'OFFLINE'}`);
    
    const socketReady = await checkPort(3005);
    console.log(`Socket Server (3005): ${socketReady ? 'ONLINE' : 'OFFLINE'}`);
    
    const webReady = await checkPort(3000);
    console.log(`Web App (3000): ${webReady ? 'ONLINE' : 'OFFLINE'}`);
    
    if (redisReady) {
        try {
            const redis = new Redis('redis://127.0.0.1:6379');
            const heartbeat = await redis.get('system:health:worker');
            console.log(`Worker Heartbeat: ${heartbeat ? 'DETECTED' : 'NOT FOUND'}`);
            if (heartbeat) console.log(`Heartbeat Data: ${heartbeat}`);
            redis.quit();
        } catch (e) {
            console.log(`Error checking heartbeat: ${e.message}`);
        }
    }
}

run();
