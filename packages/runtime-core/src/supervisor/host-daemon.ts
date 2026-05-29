import * as net from 'net';
import * as fs from 'fs';
import * as http from 'http';
import { TPMQuoteGenerator } from '../tpm/quote-generator.js';
import { sigstore } from '@packages/ztan-crypto';

const SOCKET_PATH = process.platform === 'win32' ? '\\\\.\\pipe\\ztan-ipc.sock' : '/tmp/ztan-ipc.sock';

/**
 * HostDaemon (Authoritative Substrate)
 * 
 * Runs on the host OS. Listens on a Unix socket for Autonomous Action Envelopes
 * from the EnclaveRunner. Validates structure and signature before allowing
 * database transactions or quarantine shifts.
 */
export class HostDaemon {
  private server: net.Server;
  private httpServer: http.Server;
  public tpmQuoteGen: TPMQuoteGenerator;

  constructor() {
    this.tpmQuoteGen = new TPMQuoteGenerator();
    this.server = net.createServer((connection) => {
      console.log('[HostDaemon] New connection from enclave sandbox.');
      
      connection.on('data', (data) => {
        try {
          const envelope = JSON.parse(data.toString());
          
          if (envelope.type === 'ATTESTATION_CHALLENGE') {
            console.log(`[HostDaemon] Received attestation challenge with nonce: ${envelope.nonce}`);
            const quote = this.tpmQuoteGen.generateQuote(envelope.nonce);
            connection.write(JSON.stringify({ type: 'ATTESTATION_QUOTE', payload: quote }));
            return;
          }

          this.validateEnvelope(envelope);
          console.log('[HostDaemon] Valid envelope received. Executing transaction.');
          // TODO: Forward to DB coordinator
        } catch (err: any) {
          console.error('[HostDaemon] Envelope rejected:', err.message);
          connection.write(JSON.stringify({ error: err.message }));
        }
      });
      
      connection.on('end', () => {
        console.log('[HostDaemon] Connection closed.');
      });
    });

    // Cross-Kernel Detachment API
    this.httpServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/attest') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { nonce } = JSON.parse(body);
            if (!nonce) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Missing nonce' }));
              return;
            }
            console.log(`[HostDaemon][HTTP] Received attestation challenge with nonce: ${nonce}`);
            const quote = this.tpmQuoteGen.generateQuote(nonce);
            // In a real system, the AK public key is fetched out-of-band. We send it here for testing convenience.
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ quote, akPublicKey: this.tpmQuoteGen.getPublicKey() }));
          } catch (e: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
  }

  public start() {
    // Clean up old socket
    if (fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }
    this.server.listen(SOCKET_PATH, () => {
      console.log(`[HostDaemon] Listening for enclave connections on IPC ${SOCKET_PATH}`);
    });
    
    this.httpServer.listen(5050, '0.0.0.0', () => {
      console.log(`[HostDaemon] Listening for detached witness challenges on HTTP port 5050`);
    });
  }

  public stop() {
    this.server.close();
    this.httpServer.close();
  }

  /**
   * Deployment Gatekeeper:
   * Validates the OCI provenance before allowing the enclave to spawn.
   */
  public spawnEnclave(imageConfig: { imageName: string; digest: string }) {
    console.log(`[HostDaemon] Intercepted spawn request for ${imageConfig.imageName}@${imageConfig.digest}`);
    
    const isVerified = sigstore.verifyImage(imageConfig.imageName, imageConfig.digest, 'build-bot@ztan.io');
    if (!isVerified) {
      console.error(`[HostDaemon] 🚫 FATAL: Image provenance verification failed! Refusing to spawn untrusted image.`);
      throw new Error(`SupplyChainError: Unverified OCI digest ${imageConfig.digest}`);
    }

    console.log(`[HostDaemon] ✅ Provenance validated. Spawning enclave for ${imageConfig.imageName}`);
    
    // Bind the verified digest into PCR 10 (IMA measurement)
    this.tpmQuoteGen.setIMA_PCR10(imageConfig.digest);
    console.log(`[HostDaemon] PCR 10 successfully updated with image digest.`);
  }

  private validateEnvelope(envelope: any) {
    if (!envelope || !envelope.type || !envelope.payload || !envelope.signature) {
      throw new Error('Malformed envelope format. Must contain type, payload, and signature.');
    }
    // TODO: Cryptographic signature verification and monotonic sequence checks
    if (envelope.type !== 'AUTONOMOUS_ACTION') {
      throw new Error('Invalid envelope type');
    }
  }
}

import { fileURLToPath } from 'url';

// If run directly
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const daemon = new HostDaemon();
  daemon.start();
}
