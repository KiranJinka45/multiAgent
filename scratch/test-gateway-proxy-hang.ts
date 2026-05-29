import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';

import jwt from 'jsonwebtoken';

dotenv.config();

function httpRequest(options: http.RequestOptions, bodyData: string | null = null): Promise<any> {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request({
      ...options,
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers, latency: Date.now() - start }));
    });
    
    req.on('error', (err) => resolve({ status: 0, body: '', latency: Date.now() - start, error: err }));
    req.on('timeout', () => { 
      req.destroy(); 
      resolve({ status: 0, body: '', latency: Date.now() - start, error: new Error('Timeout') }); 
    });

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function test() {
  const secret = process.env.JWT_SECRET || 'super-secret-key-123-that-is-at-least-thirty-two-chars-long';
  const token = jwt.sign(
    {
      id: 'ZTAN-OPERATOR-01',
      email: 'operator@ztan.local',
      roles: ['admin', 'operator'],
      permissions: ['admin', 'system:manage', 'billing:manage', 'missions:write', 'missions:read', 'agents:read', 'agents:write', 'logs:read']
    },
    secret,
    { expiresIn: '1h' }
  );

  console.log('🚀 Starting CoreAPI on port 4555...');
  const coreEnv = {
    ...process.env,
    PORT: '4555',
    NODE_ENV: 'test',
    LOG_LEVEL: 'warn'
  };
  const coreProc = spawn('node', ['apps/core-api/dist/index.js'], { env: coreEnv });
  
  console.log('🚀 Starting Gateway on port 4556...');
  const gwEnv = {
    ...process.env,
    PORT: '4556',
    GATEWAY_PORT: '4556',
    CORE_API_PORT: '4555',
    CORE_API_URL: 'http://127.0.0.1:4555',
    NODE_ENV: 'development', // to allowDevBypass in userAuth
    LOG_LEVEL: 'info'
  };
  const gwProc = spawn('node', ['apps/gateway/dist/index.js'], { env: gwEnv });

  coreProc.stdout.on('data', (d) => console.log(`[CoreAPI STDOUT] ${d.toString().trim()}`));
  coreProc.stderr.on('data', (d) => console.error(`[CoreAPI STDERR] ${d.toString().trim()}`));
  
  gwProc.stdout.on('data', (d) => console.log(`[Gateway STDOUT] ${d.toString().trim()}`));
  gwProc.stderr.on('data', (d) => console.error(`[Gateway STDERR] ${d.toString().trim()}`));

  console.log('⏳ Waiting 10 seconds for services to stabilize...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('📡 Sending drill/trigger request to Gateway port 4556...');
  const body = JSON.stringify({ id: 'IFD-001' });
  const res = await httpRequest({
    hostname: '127.0.0.1',
    port: 4556,
    path: '/api/v1/ztan/governance/drill/trigger',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      // Set a fake authorization token so userAuth passes
      'Authorization': `Bearer ${token}`,
      'X-Internal-Token': 'default-internal-secret-that-is-at-least-thirty-two-chars-long'
    }
  }, body);

  console.log('📊 Response:', res);

  console.log('🛑 Terminating services...');
  coreProc.kill('SIGKILL');
  gwProc.kill('SIGKILL');
}

test().catch(console.error);
