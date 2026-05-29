import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';

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
  console.log('🚀 Starting CoreAPI on port 4555...');
  const env = {
    ...process.env,
    PORT: '4555',
    NODE_ENV: 'test',
    LOG_LEVEL: 'info'
  };
  
  const proc = spawn('node', ['apps/core-api/dist/index.js'], { env });
  
  proc.stdout.on('data', (d) => console.log(`[CoreAPI STDOUT] ${d.toString().trim()}`));
  proc.stderr.on('data', (d) => console.error(`[CoreAPI STDERR] ${d.toString().trim()}`));

  console.log('⏳ Waiting 8 seconds for CoreAPI to stabilize...');
  await new Promise(r => setTimeout(r, 8000));

  console.log('📡 Sending drill/trigger request directly to CoreAPI port 4555...');
  const body = JSON.stringify({ id: 'IFD-001' });
  const res = await httpRequest({
    hostname: '127.0.0.1',
    port: 4555,
    path: '/api/v1/ztan/governance/drill/trigger',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  console.log('📊 Response:', res);

  console.log('🛑 Terminating CoreAPI...');
  proc.kill('SIGKILL');
}

test().catch(console.error);
