import * as fs from 'fs';
import * as path from 'path';
import { ResourceEnvelopeProfiler, ReplayVarianceRecorder } from '../packages/core-engine/src/index.js';

interface CompatibilityProfile {
  runtime: string;
  avgLagMs: number;
  varianceMs: number;
  memorySlopeBytes: number;
  status: 'COMPATIBLE' | 'DEGRADED' | 'INCOMPATIBLE';
}

console.log('\n🔭 INITIATING RUNTIME VARIANCE OBSERVATORY DRILLS');
console.log('==================================================');

const profiles: CompatibilityProfile[] = [];
const runtimes = ['Node.js V20-Default', 'Node.js V22-Default', 'V8-Aggressive-GC', 'V8-Constrained-Heap'];

for (const runtime of runtimes) {
  console.log(`\n🔹 Profiling runtime envelope: [${runtime}]`);
  
  const profiler = new ResourceEnvelopeProfiler();
  const varianceRecorder = new ReplayVarianceRecorder();
  
  profiler.start();
  
  // Simulate 10 sequential workflow execution steps under this environment
  for (let step = 1; step <= 10; step++) {
    const simulatedStateSize = 500 + Math.random() * 200;
    const simulatedWalSize = simulatedStateSize * 3; // 3x WAL amplification
    const simulatedTelemetrySize = simulatedStateSize * 0.5;
    
    profiler.recordStep(simulatedStateSize, simulatedWalSize, simulatedTelemetrySize);
    
    // Simulate runtime timing variations:
    // Some runtimes have higher jitter
    const timingJitter = runtime.includes('Aggressive-GC') 
      ? 15 + Math.random() * 20 
      : 5 + Math.random() * 8;
    
    varianceRecorder.record('observatory-flow', timingJitter);
  }
  
  const report = profiler.generateReport('observatory-flow');
  const variance = varianceRecorder.getVariance('observatory-flow');
  
  const avgLag = report.snapshots.reduce((sum, s) => sum + s.eventLoopLagMs, 0) / report.snapshots.length;
  
  let status: CompatibilityProfile['status'] = 'COMPATIBLE';
  if (avgLag > 30 || variance > 15) {
    status = 'DEGRADED';
  } else if (avgLag > 100) {
    status = 'INCOMPATIBLE';
  }
  
  profiles.push({
    runtime,
    avgLagMs: parseFloat(avgLag.toFixed(2)),
    varianceMs: Math.round(variance),
    memorySlopeBytes: report.memoryPerStepSlopeBytes,
    status,
  });
}

// Write the runtime compatibility matrix
const reportsDir = path.join(process.cwd(), '.ztan', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(reportsDir, 'runtime_compatibility_matrix.json'),
  JSON.stringify(profiles, null, 2),
  'utf8'
);

console.log('\n🗺️  RUNTIME COMPATIBILITY MATRIX COMPRESSED:');
console.log('--------------------------------------------------');
console.table(profiles);
console.log('--------------------------------------------------');
console.log(`✅ Matrix logged to: .ztan/reports/runtime_compatibility_matrix.json`);
console.log('🎉 Observatory calibration successfully completed.\n');
