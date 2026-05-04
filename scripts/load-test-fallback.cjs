const { io } = require('socket.io-client');

const URL = 'http://127.0.0.1:3001';
const MAX_CONNECTIONS = 10000;
const RAMP_UP_INTERVAL = 10; // ms between connections

console.log(`🚀 Starting Concurrency Load Test: ${MAX_CONNECTIONS} users on ${URL}`);

let connected = 0;
let errors = 0;

function createConnection(id) {
  const socket = io(URL, {
    transports: ['websocket'],
    auth: { token: 'test-token' },
    reconnection: false
  });

  socket.on('connect', () => {
    connected++;
    if (connected % 500 === 0) {
      console.log(`📡 Connected: ${connected}/${MAX_CONNECTIONS}`);
    }
  });

  socket.on('connect_error', (err) => {
    errors++;
    if (errors % 100 === 0) {
      console.error(`❌ Connection Errors: ${errors}`);
    }
  });

  socket.on('disconnect', () => {
    connected--;
  });
}

function start() {
  let count = 0;
  const interval = setInterval(() => {
    createConnection(count++);
    if (count >= MAX_CONNECTIONS) {
      clearInterval(interval);
      console.log('✅ All connection attempts initiated.');
    }
  }, RAMP_UP_INTERVAL);
}

// Keep process alive to observe stability
setInterval(() => {
  console.log(`📊 Statistics: ${connected} active, ${errors} failed`);
}, 5000);

start();
