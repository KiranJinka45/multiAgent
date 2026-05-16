
# ZTAN Recovery Trend Analysis
Generated at: 2026-05-13T19:29:11.862Z

## 📈 Summary Metrics
- **Total Drills**: 7
- **Success Rate**: 42.9%
- **Average Restore Duration (Success)**: 362.62s
- **Cumulative Operational Failure Rate**: 57.1%

## ⏱️ Longitudinal Duration Trend
- 2026-05-13T13:11:01.624Z: **45s** (OCR_DRILL)
- 2026-05-13T13:24:56.302Z: **42s** (OCR_DRILL)
- 2026-05-13T18:56:28.595Z: **1000.85s** (NUCLEAR_CLEAN)

## ⚠️ Recent Failures & Friction
- 2026-05-13T13:02:06.282Z: [FAILED] Drill failed during execution. Check terminal logs.
- 2026-05-13T18:14:30.512Z: [FAILED] EPERM: operation not permitted, unlink 'C:\multiagentic_project\multiAgent-main\node_modules\@angular\build\node_modules\esbuild\node_modules\@esbuild\win32-x64\esbuild.exe'
- 2026-05-13T18:58:57.649Z: [FAILED] Failed to remove C:\multiagentic_project\multiAgent-main\node_modules after 5 re
- 2026-05-13T19:18:17.771Z: [FAILED] ENOTEMPTY: directory not empty, rmdir 'C:\multiagentic_project\multiAgent-main\n

## 🧠 Strategic Observations
- **Cleanup Friction**: Windows file locks (EPERM/ENOTEMPTY) remain the primary source of restoration latency.
- **Bootstrapping Cost**: Cold-cache (NUCLEAR_CLEAN) restoration incurs a ~16m penalty vs ~45s for incremental OCR.
- **Reproducibility Confidence**: High (Verified end-to-end reconstruction from zero state).
