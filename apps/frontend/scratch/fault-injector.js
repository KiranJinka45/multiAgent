const express = require('express');
const app = express();
const port = 4081; // Test Port

let state = {
  apiHealthy: true,
  latencyMs: 0,
  errorRate: 0,
};

app.use(express.json());

// Proxy / Mock Health Endpoint
app.get('/system-health', (req, res) => {
  setTimeout(() => {
    if (!state.apiHealthy) {
      return res.status(500).json({ success: false, error: 'ECONNREFUSED' });
    }
    if (Math.random() < state.errorRate) {
      return res.status(503).json({ success: false, error: 'Service Unavailable' });
    }
    res.json({
      success: true,
      data: {
        activeWorkers: state.apiHealthy ? 12 : 0,
        totalWorkers: 15,
        queueDepth: state.apiHealthy ? 45 : 0,
        avgLatency: state.latencyMs || 120,
        errorRate: state.errorRate * 100,
        mode: state.apiHealthy ? 'NORMAL' : 'DOWN'
      }
    });
  }, state.latencyMs);
});

// Control API for Tests
app.post('/toggle-fault', (req, res) => {
  state = { ...state, ...req.body };
  console.log('Current Fault State:', state);
  res.json(state);
});

app.listen(port, () => {
  console.log(`Fault Injector running at http://localhost:${port}`);
});
