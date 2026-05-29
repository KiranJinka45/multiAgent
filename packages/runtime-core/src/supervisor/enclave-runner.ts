import * as net from 'net';

const SOCKET_PATH = '/var/run/ztan-ipc.sock';

/**
 * EnclaveRunner (Advisory Sandbox)
 * 
 * Runs inside the Tier H0 isolated boundary (gVisor/Firecracker).
 * Does NOT have direct DB or host access.
 * Communicates strictly by sending signed, monotonic envelopes to the HostDaemon.
 */
export class EnclaveRunner {
  private client: net.Socket;

  constructor() {
    this.client = net.createConnection(SOCKET_PATH, () => {
      console.log('[EnclaveRunner] Connected to Host Daemon via IPC socket.');
    });

    this.client.on('error', (err) => {
      console.error('[EnclaveRunner] IPC connection error:', err.message);
    });

    this.client.on('data', (data) => {
      console.log('[EnclaveRunner] Received from host:', data.toString());
    });
  }

  public sendAdvisoryAction(payload: any) {
    const envelope = {
      type: 'AUTONOMOUS_ACTION',
      payload: payload,
      // Mock signature for Wave 1 containment testing
      signature: 'dummy_sig_wave1'
    };
    
    console.log('[EnclaveRunner] Dispatching action envelope to host...');
    this.client.write(JSON.stringify(envelope));
  }
}

// If run directly (e.g. inside the sandbox)
if (require.main === module) {
  console.log('[EnclaveRunner] Starting up in isolated sandbox...');
  const runner = new EnclaveRunner();
  
  // Simulate an agent action
  setTimeout(() => {
    runner.sendAdvisoryAction({
      agentId: 'advisory-agent-1',
      action: 'RECOMMEND_STATE_UPDATE'
    });
  }, 1000);
}
