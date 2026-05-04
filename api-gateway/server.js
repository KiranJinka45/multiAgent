const express = require('express');
const cors = require('cors');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = 'http://127.0.0.1:3007';
const PORTS = {
  gateway: 4005,
  auth: 4000,
};

app.use(express.json());

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
}));

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    port: PORTS.gateway,
  });
});

app.use('/api/auth', createProxyMiddleware({
  target: `http://127.0.0.1:${PORTS.auth}`,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
}));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
});

server.listen(PORTS.gateway, '127.0.0.1', () => {
  console.log(`Gateway running on http://127.0.0.1:${PORTS.gateway}`);
});