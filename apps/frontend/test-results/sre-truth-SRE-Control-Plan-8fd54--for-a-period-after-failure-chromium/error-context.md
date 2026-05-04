# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sre-truth.spec.ts >> SRE Control Plane: Proof of Truth >> Hysteresis Test: Should stay in RECOVERING for a period after failure
- Location: e2e\sre-truth.spec.ts:89:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.status-pill.recovering, .status-pill.warning')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('.status-pill.recovering, .status-pill.warning')

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e6]:
    - generic [ref=e7]: ⚠️
    - generic [ref=e8]: Connection to control plane lost. Reconnecting...
  - banner [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]: ⚡
      - generic [ref=e13]: MultiAgent Control Plane
    - generic [ref=e14]:
      - generic [ref=e17]: SYSTEM INCIDENT
      - generic [ref=e19] [cursor=pointer]: OP
  - generic [ref=e20]:
    - complementary [ref=e22]:
      - list [ref=e23]:
        - listitem [ref=e24]:
          - link "🚀 Missions" [ref=e25] [cursor=pointer]:
            - /url: /missions
            - generic [ref=e26]: 🚀
            - generic [ref=e27]: Missions
        - listitem [ref=e28]:
          - link "🕒 Timeline" [ref=e29] [cursor=pointer]:
            - /url: /timeline
            - generic [ref=e30]: 🕒
            - generic [ref=e31]: Timeline
        - listitem [ref=e32]:
          - link "🏥 System Health" [ref=e33] [cursor=pointer]:
            - /url: /health
            - generic [ref=e34]: 🏥
            - generic [ref=e35]: System Health
        - listitem [ref=e36]:
          - link "📊 Usage" [ref=e37] [cursor=pointer]:
            - /url: /usage
            - generic [ref=e38]: 📊
            - generic [ref=e39]: Usage
        - listitem [ref=e40]:
          - link "💎 Pricing" [ref=e41] [cursor=pointer]:
            - /url: /pricing
            - generic [ref=e42]: 💎
            - generic [ref=e43]: Pricing
        - listitem [ref=e44]
        - listitem [ref=e45]:
          - link "🕹️ Cockpit" [ref=e46] [cursor=pointer]:
            - /url: /admin
            - generic [ref=e47]: 🕹️
            - generic [ref=e48]: Cockpit
        - listitem [ref=e49]:
          - link "💬 Feedback" [ref=e50] [cursor=pointer]:
            - /url: mailto:support@multiagent.io?subject=Beta%20Feedback
            - generic [ref=e51]: 💬
            - generic [ref=e52]: Feedback
    - main [ref=e53]:
      - generic [ref=e55]:
        - generic [ref=e56]:
          - heading "System Health" [level=1] [ref=e57]
          - generic [ref=e58]: Incident Active
        - generic [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]:
              - generic [ref=e62]: "MEDIUM INCIDENT #INC-1777406218-ux8kz"
              - generic [ref=e63]: "Duration: 30:19"
            - generic [ref=e64]:
              - generic [ref=e65]:
                - strong [ref=e66]: "Root Cause:"
                - text: Prolonged system instability detected.
              - generic [ref=e67]:
                - strong [ref=e68]: "Escalation:"
                - text: Slack, PagerDuty (MEDIUM)
            - generic [ref=e69]:
              - generic [ref=e70]:
                - generic [ref=e71]: 🔒
                - generic [ref=e72]: "SAFE-MODE: Destructive actions locked."
              - button "📄 Export RCA Report" [ref=e73] [cursor=pointer]
          - generic [ref=e74]:
            - generic [ref=e75]:
              - generic [ref=e76]:
                - generic [ref=e77]:
                  - generic [ref=e78]:
                    - generic [ref=e79]: 🚨
                    - heading "Autonomous Control Plane" [level=3] [ref=e80]
                  - generic [ref=e81]: INCIDENT MODE
                - generic [ref=e82]:
                  - generic [ref=e83]:
                    - generic [ref=e84]: Error Rate
                    - generic [ref=e85]: 0.5%
                  - generic [ref=e86]:
                    - generic [ref=e87]: Confidence Score
                    - generic [ref=e90]: 0%
                  - generic [ref=e91]:
                    - generic [ref=e92]: System Mode
                    - generic [ref=e93]: System is in an active incident state. Multiple SLO breaches detected.
              - generic [ref=e94]:
                - generic [ref=e95]:
                  - generic [ref=e96]: Active Workers
                  - generic [ref=e98]: 12 / 15
                  - generic [ref=e101]: "Target: < 90% utilization"
                - generic [ref=e102]:
                  - generic [ref=e103]: Event Backbone PEL
                  - generic [ref=e105]: "5"
                  - generic [ref=e106]: Pending group messages
                  - generic [ref=e107]: "SLA: < 25 events"
                - generic [ref=e108]:
                  - generic [ref=e109]: E2E Event Latency
                  - generic [ref=e111]: 45ms
                  - generic [ref=e112]: Stream head to consumer
                  - generic [ref=e113]: "SLA: < 500ms"
                - generic [ref=e114]:
                  - generic [ref=e115]: DLQ Volume
                  - generic [ref=e117]: "0"
                  - generic [ref=e118]: Poison messages isolated
                  - generic [ref=e119]: "GOAL: 0 messages"
              - generic [ref=e120]:
                - heading "Worker Fleet Registry" [level=3] [ref=e121]
                - generic [ref=e122]:
                  - generic [ref=e123]:
                    - generic [ref=e124]: worker-1
                    - generic [ref=e125]: Running
                    - generic [ref=e126]: 20% CPU
                  - generic [ref=e127]:
                    - generic [ref=e128]: worker-2
                    - generic [ref=e129]: Running
                    - generic [ref=e130]: 25% CPU
                  - generic [ref=e131]:
                    - generic [ref=e132]: worker-3
                    - generic [ref=e133]: Running
                    - generic [ref=e134]: 30% CPU
                  - generic [ref=e135]:
                    - generic [ref=e136]: worker-4
                    - generic [ref=e137]: Running
                    - generic [ref=e138]: 35% CPU
                  - generic [ref=e139]:
                    - generic [ref=e140]: worker-5
                    - generic [ref=e141]: Running
                    - generic [ref=e142]: 40% CPU
                  - generic [ref=e143]:
                    - generic [ref=e144]: worker-6
                    - generic [ref=e145]: Running
                    - generic [ref=e146]: 45% CPU
            - generic [ref=e147]:
              - generic [ref=e148]:
                - heading "Control Actions" [level=3] [ref=e150]
                - generic [ref=e151]:
                  - button "🔄 Force Recovery" [ref=e152] [cursor=pointer]:
                    - generic [ref=e153]: 🔄
                    - text: Force Recovery
                  - button "📤 Replay DLQ" [disabled] [ref=e154]:
                    - generic [ref=e155]: 📤
                    - text: Replay DLQ
                  - button "🛡️ Shield Mode" [disabled] [ref=e156]:
                    - generic [ref=e157]: 🛡️
                    - text: Shield Mode
                  - button "⚠️ Drain Fleet" [disabled] [ref=e158]:
                    - generic [ref=e159]: ⚠️
                    - text: Drain Fleet
              - generic [ref=e160]:
                - heading "System Governance" [level=3] [ref=e161]
                - generic [ref=e162]:
                  - generic [ref=e163]: Trace Persistence
                  - generic [ref=e164]: DURABLE SYNC ACTIVE
                - generic [ref=e165]:
                  - generic [ref=e166]: External Hooks
                  - generic [ref=e167]: "WEBHOOKS: DISPATCH READY"
                - generic [ref=e168]:
                  - generic [ref=e169]: Audit Integrity
                  - generic [ref=e170]: SIGNED TRACE LOGS
              - generic [ref=e171]:
                - generic [ref=e172]:
                  - heading "System Trace Log" [level=3] [ref=e173]
                  - generic [ref=e174]: 4 events
                - generic [ref=e175]:
                  - generic [ref=e176]:
                    - generic [ref=e177]:
                      - generic [ref=e178]: 01:26:58
                      - generic [ref=e179]: CRITICAL
                    - generic [ref=e180]: "System state: DEGRADED -> INCIDENT"
                  - generic [ref=e181]:
                    - generic [ref=e182]:
                      - generic [ref=e183]: 01:26:58
                      - generic [ref=e184]: INFO
                    - generic [ref=e185]: "📡 External Alert Dispatched: MEDIUM alert sent to Slack/Webhooks."
                  - generic [ref=e186]:
                    - generic [ref=e187]:
                      - generic [ref=e188]: 01:26:58
                      - generic [ref=e189]: CRITICAL
                    - generic [ref=e190]: "Incident opened: INC-1777406218-ux8kz [SEV: MEDIUM] - Prolonged system instability detected."
                  - generic [ref=e191]:
                    - generic [ref=e192]:
                      - generic [ref=e193]: 01:26:43
                      - generic [ref=e194]: WARNING
                    - generic [ref=e195]: "System state: NORMAL -> DEGRADED"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('SRE Control Plane: Proof of Truth', () => {
  4   |   const state = {
  5   |     apiHealthy: true
  6   |   };
  7   | 
  8   |   test.beforeEach(async ({ page }) => {
  9   |     state.apiHealthy = true;
  10  |     
  11  |     // Intercept API calls to simulate system health telemetry
  12  |     await page.route('**/system-health', async route => {
  13  |       if (state.apiHealthy) {
  14  |         await route.fulfill({
  15  |           status: 200,
  16  |           contentType: 'application/json',
  17  |           body: JSON.stringify({
  18  |             success: true,
  19  |             data: {
  20  |               activeWorkers: 12,
  21  |               totalWorkers: 15,
  22  |               errorRate: 0.5,
  23  |               confidence: 98,
  24  |               avgLatency: 120,
  25  |               mode: 'NORMAL',
  26  |               events: { streamLength: 100, pelSize: 5, dlqSize: 0, latencyMs: 45 },
  27  |               log: [
  28  |                 { timestamp: 1714322400000, type: 'INFO', message: 'System healthy' }
  29  |               ]
  30  |             }
  31  |           })
  32  |         });
  33  |       } else {
  34  |         await route.fulfill({
  35  |           status: 200,
  36  |           contentType: 'application/json',
  37  |           body: JSON.stringify({
  38  |             success: true,
  39  |             data: {
  40  |               activeWorkers: 15,
  41  |               totalWorkers: 15,
  42  |               errorRate: 8.5,
  43  |               confidence: 42,
  44  |               avgLatency: 2500,
  45  |               mode: 'INCIDENT',
  46  |               events: { streamLength: 500, pelSize: 150, dlqSize: 12, latencyMs: 3200 },
  47  |               log: [
  48  |                 { timestamp: 1714322400000, type: 'ERROR', message: 'High latency detected' },
  49  |                 { timestamp: 1714322401000, type: 'INCIDENT', message: 'Breached Error Budget' }
  50  |               ]
  51  |             }
  52  |           })
  53  |         });
  54  |       }
  55  |     });
  56  | 
  57  |     // Mock WebSocket to prevent 'Offline' state
  58  |     await page.addInitScript(() => {
  59  |       (window as any).WebSocket = class {
  60  |         onopen = () => {};
  61  |         onmessage = () => {};
  62  |         onclose = () => {};
  63  |         onerror = () => {};
  64  |         send = () => {};
  65  |         close = () => {};
  66  |         addEventListener = (type, listener) => {
  67  |           if (type === 'open') setTimeout(() => listener({}), 100);
  68  |         };
  69  |       } as any;
  70  |     });
  71  |   });
  72  | 
  73  |   async function resetApp(page) {
  74  |     await page.goto('/health');
  75  |     await page.evaluate(() => window.localStorage.clear());
  76  |     await page.reload({ waitUntil: 'networkidle' });
  77  |     await page.waitForSelector('.sre-dashboard', { timeout: 30000 });
  78  |   }
  79  | 
  80  |   test('Truth Test: Should transition to INCIDENT when telemetry degrades', async ({ page }) => {
  81  |     await resetApp(page);
  82  |     await expect(page.getByTestId('status-pill')).toBeVisible({ timeout: 25000 });
  83  | 
  84  |     state.apiHealthy = false;
  85  |     await expect(page.locator('.status-pill.incident, .status-pill.emergency')).toBeVisible({ timeout: 20000 });
  86  |     await expect(page.locator('.incident-card')).toBeVisible();
  87  |   });
  88  | 
  89  |   test('Hysteresis Test: Should stay in RECOVERING for a period after failure', async ({ page }) => {
  90  |     await resetApp(page);
  91  |     
  92  |     // 1. Trigger Failure
  93  |     state.apiHealthy = false;
  94  |     await expect(page.locator('.status-pill.incident')).toBeVisible({ timeout: 20000 });
  95  | 
  96  |     // 2. Resolve Failure
  97  |     state.apiHealthy = true;
  98  |     await page.waitForTimeout(3000); // Wait for poll
  99  | 
  100 |     // 3. Verify Hysteresis State
> 101 |     await expect(page.locator('.status-pill.recovering, .status-pill.warning')).toBeVisible({ timeout: 20000 });
      |                                                                                 ^ Error: expect(locator).toBeVisible() failed
  102 |     await expect(page.locator('.status-pill')).toContainText('RECOVERING');
  103 |     
  104 |     // 4. Verify it doesn't flip back to NORMAL immediately
  105 |     await page.waitForTimeout(3000);
  106 |     await expect(page.locator('.status-pill.operational')).not.toBeVisible();
  107 |   });
  108 | 
  109 |   test('Safe-Mode Test: Should lock destructive actions during Incident', async ({ page }) => {
  110 |     await resetApp(page);
  111 |     state.apiHealthy = false;
  112 |     await expect(page.locator('.incident-card')).toBeVisible({ timeout: 20000 });
  113 | 
  114 |     const warning = page.locator('.safe-mode-warning');
  115 |     await expect(warning).toBeVisible();
  116 | 
  117 |     const drainBtn = page.locator('button:has-text("Drain")');
  118 |     await expect(drainBtn).toBeDisabled();
  119 |   });
  120 | 
  121 |   test('Durability Test: Should persist state after refresh', async ({ page }) => {
  122 |     await resetApp(page);
  123 |     state.apiHealthy = false;
  124 |     await expect(page.locator('.status-pill.incident')).toBeVisible({ timeout: 20000 });
  125 |     
  126 |     // Refresh page
  127 |     await page.reload({ waitUntil: 'networkidle' });
  128 |     await page.waitForSelector('.sre-dashboard', { timeout: 20000 });
  129 | 
  130 |     // Verify state persistence (initial state from localStorage)
  131 |     await expect(page.locator('.status-pill.incident')).toBeVisible({ timeout: 15000 });
  132 |   });
  133 | });
  134 | 
```