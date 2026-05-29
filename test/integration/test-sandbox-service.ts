import { createServer } from '../../apps/sandbox-service/src/server.js';
import axios from 'axios';
import { logger } from '@packages/observability';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZTAN SANDBOX & SIMULATION SERVICE TEST         ║');
  console.log('║           - Validating Isolation & Simulation Plane -    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const app = createServer();
  const PORT = 3095;
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const server = app.listen(PORT, () => {
    logger.info(`Test server listening on port ${PORT}`);
  });

  let passed = true;

  try {
    // Wait for server stabilization
    await wait(1000);

    // ─── Test 1: Health Check ───
    console.log('🧪 Running Test 1: Health Check...');
    const healthRes = await axios.get(`${baseUrl}/health`);
    if (healthRes.status === 200 && healthRes.data.status === 'ok') {
      console.log('✅ Health Check Passed.');
    } else {
      throw new Error(`Expected health ok, got: ${JSON.stringify(healthRes.data)}`);
    }

    // ─── Test 2: Speculative Simulation Reversible Actions ───
    console.log('\n🧪 Running Test 2: Speculative Simulation (Reversible Actions)...');
    const simulationSafeRes = await axios.post(`${baseUrl}/api/v1/simulate`, {
      projectId: 'simulation-test-project',
      workflow: {
        nodes: [
          {
            id: 'node-1',
            actionType: 'CREATE_FILE',
            payload: { path: 'index.js', content: 'console.log("hello");' }
          },
          {
            id: 'node-2',
            actionType: 'WRITE_DATABASE',
            payload: { query: 'INSERT INTO users VALUES (1);' }
          }
        ],
        edges: [
          { from: 'node-1', to: 'node-2' }
        ]
      },
      initialState: { dbState: 'clean' }
    });

    const safeSimData = simulationSafeRes.data;
    console.log('Safe Simulation Output:', JSON.stringify(safeSimData, null, 2));

    if (
      safeSimData.success === true &&
      safeSimData.overall_rollback_confidence === 1.0 &&
      safeSimData.quarantine_triggered === false
    ) {
      console.log('✅ Speculative Simulation (Reversible) Passed.');
    } else {
      throw new Error(`Expected successful reversible simulation, got: ${JSON.stringify(safeSimData)}`);
    }

    // ─── Test 3: Speculative Simulation Irreversible Actions ───
    console.log('\n🧪 Running Test 3: Speculative Simulation (Irreversible Actions)...');
    const simulationIrreversibleRes = await axios.post(`${baseUrl}/api/v1/simulate`, {
      projectId: 'simulation-test-project',
      workflow: {
        nodes: [
          {
            id: 'node-1',
            actionType: 'CREATE_FILE',
            payload: { path: 'index.js' }
          },
          {
            id: 'node-2',
            actionType: 'PROCESS_PAYMENT',
            payload: { amount: 50.0 }
          }
        ],
        edges: [
          { from: 'node-1', to: 'node-2' }
        ]
      }
    });

    const irrSimData = simulationIrreversibleRes.data;
    console.log('Irreversible Simulation Output:', JSON.stringify(irrSimData, null, 2));

    if (
      irrSimData.success === false &&
      irrSimData.overall_rollback_confidence === 0.0 &&
      irrSimData.quarantine_triggered === true
    ) {
      console.log('✅ Speculative Simulation (Irreversible Block) Passed.');
    } else {
      throw new Error(`Expected blocked irreversible simulation, got: ${JSON.stringify(irrSimData)}`);
    }

    // ─── Test 4: Sandbox Supervision Resource Violations ───
    console.log('\n🧪 Running Test 4: Sandbox Supervision (Resource Violations)...');
    const superviseRes1 = await axios.post(`${baseUrl}/api/v1/supervise`, {
      resources: {
        cpuPercent: 99.0, // High CPU violation
        memoryMb: 600.0,  // Exceeds maxMemoryLimitMb (512)
        maxMemoryLimitMb: 512
      }
    });

    const superviseData1 = superviseRes1.data;
    console.log('Resource Supervision Output:', JSON.stringify(superviseData1, null, 2));

    if (
      superviseData1.safe === false &&
      superviseData1.resource_compliant === false &&
      superviseData1.violations.some((v: string) => v.includes('Cgroup memory limit exceeded') || v.includes('Cgroup CPU budget exhausted'))
    ) {
      console.log('✅ Sandbox Supervision (Resource Violations) Passed.');
    } else {
      throw new Error(`Expected failed resource supervision, got: ${JSON.stringify(superviseData1)}`);
    }

    // ─── Test 5: Sandbox Supervision Syscall and Overlay Escapes ───
    console.log('\n🧪 Running Test 5: Sandbox Supervision (Syscall and Escape blocks)...');
    const superviseRes2 = await axios.post(`${baseUrl}/api/v1/supervise`, {
      syscalls: ['clone', 'ptrace', 'open'],
      attemptedOverlayEscapes: true,
      isolationProfile: {
        namespaceIsolation: true,
        overlayFsImmutable: false, // mutable overlays trigger violation
        hypervisorBoundary: 'None', // shared container triggers violation
        seccompBpfActive: true
      }
    });

    const superviseData2 = superviseRes2.data;
    console.log('Syscall/Escape Supervision Output:', JSON.stringify(superviseData2, null, 2));

    if (
      superviseData2.safe === false &&
      superviseData2.syscalls_blocked === true &&
      superviseData2.quarantine_triggered === true &&
      superviseData2.violations.some((v: string) => v.includes('restricted syscall: "clone"')) &&
      superviseData2.violations.some((v: string) => v.includes('overlay break-out')) &&
      superviseData2.violations.some((v: string) => v.includes('overlayfs is mutable')) &&
      superviseData2.violations.some((v: string) => v.includes('virtualization boundary is absent'))
    ) {
      console.log('✅ Sandbox Supervision (Syscalls, Overlay, Hypervisor Violations) Passed.');
    } else {
      throw new Error(`Expected blocked syscall/escape supervision, got: ${JSON.stringify(superviseData2)}`);
    }

  } catch (err: any) {
    passed = false;
    console.error('❌ Test failed with error:', err.message);
    if (err.response) {
      console.error('Error Response Data:', JSON.stringify(err.response.data));
    }
  } finally {
    console.log('\n🛑 Shutting down test server...');
    server.close(() => {
      console.log('Test server closed.');
      if (passed) {
        console.log('\n🎉 ALL SANDBOX & SIMULATION SERVICE INTEGRATION TESTS PASSED FUNCTIONALLY.');
        process.exit(0);
      } else {
        console.log('\n❌ INTEGRATION TESTS FAILED.');
        process.exit(1);
      }
    });
  }
}

run().catch((err) => {
  console.error('Fatal test wrapper failure:', err);
  process.exit(1);
});
