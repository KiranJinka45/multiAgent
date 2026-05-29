# 📊 ZTAN Continuous Regression Gate Scorecard
Generated: **2026-05-28T08:18:24.570Z**
Audited Report: `drift-report-latest.json`
Overall Verdict: 🟢 **PASSED**

## 🏛️ Gate Enforcement Outcomes

| Gate / Dimension | Current Metric | Threshold Limit | Status |
|---|---|---|---|
| HostDaemon Heap Growth Slope | 280.8164 MB/hour | <= 15000 MB/hour (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| HostDaemon Handle Leak Gate | 178.35 leak delta | <= 200 (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| Gateway Heap Growth Slope | 7387.7962 MB/hour | <= 15000 MB/hour (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| Gateway Handle Leak Gate | 0.00 leak delta | <= 200 (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| CoreAPI Heap Growth Slope | -1413.6620 MB/hour | <= 15000 MB/hour (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| CoreAPI Handle Leak Gate | 0.00 leak delta | <= 200 (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| ControlPlane Heap Growth Slope | 40.6454 MB/hour | <= 15000 MB/hour (Research/Bootstrap-Adjusted) | 🟢 **PASS** |
| ControlPlane Handle Leak Gate | 0.00 leak delta | <= 200 (Research/Bootstrap-Adjusted) | 🟢 **PASS** |

---
*Operational Reliability Engineering (ORE) Safety Gate Framework.*