# UI Specification: SRE Epistemic Observability (Phase 0)

This specification defines the **Observability-first UI** for the MultiAgent SRE Control Plane. Its purpose is to provide human operators with absolute transparency into the system's "Skeptical Reasoning" and "Hesitation Boundaries."

## 🎨 Visual Language: "The High-Rigor Dashboard"
- **Theme**: Dark Mode (Slate/ZINC).
- **Primary Color**: `Sovereign Indigo` (#4F46E5).
- **Action Color**: `Emergency Amber` (for holds/hesitation).
- **Truth Color**: `Success Emerald` (for consensus).
- **Typography**: Mono-spaced for technical data (JetBrains Mono), Sans-serif for UI labels (Inter).

## 🧩 Core Components

### 1. The "Truth Bridge" (Main View)
Displays the 3-tier model of state.
- **Intent Card**: What the system *wants* to happen (Control Plane).
- **Perception Card**: What the system *sees* (Weighted Consensus).
- **Reality Card**: What the system *infers* (Final decision).
- **Visual**: A bridge diagram showing the "gap" between tiers.

### 2. The "Consensus & Diversity" Panel
- **Quorum Gauge**: Radial progress bar showing N/M agreement.
- **Diversity Badge**: Indicator for provider-level consensus (AWS, GCP, etc.).
- **Observer List**: A table showing each node, its provider, its current state, and its **Reputation Score**.
- **Weight Heatmap**: Subtle pulse animation on nodes that are currently being "Decayed."

### 3. The "Hesitation Monitor" (Priority 1)
- **Status Indicator**: GLOWING Amber pulse when system is in `HALT` or `STABILIZING`.
- **Reason Feed**: Text string explaining the hesitation (e.g., "Insufficient Provider Diversity").
- **Hold Duration**: A high-precision timer showing how long the system has been skeptical.
- **TTAC Bar**: Progress bar showing current wait vs. expected propagation window.

### 4. The "Execution Timeline"
- **Event Stream**: Chronological list of truth transitions.
  - `DRIFT_DETECTED` (t=0)
  - `QUORUM_REACHED` (t=4s)
  - `STABILIZATION_WINDOW_ACTIVE` (t=4.1s)
  - `ACTION_COMMITTED` (t=9.1s)
  - `CONVERGENCE_CONFIRMED` (t=15s)

## 📡 API Integration Contract
The UI connects to the `truth-loop.js` and `reconciler.js` via a WebSocket stream or EventSource.

```typescript
interface SREStatusUpdate {
  intent: string;
  perception: {
    consensus: number;
    diversity: boolean;
    weightedConfidence: number;
  };
  governance: {
    mode: 'STABLE' | 'HEALING' | 'HALTED';
    reason: string;
    holdTimeMs: number;
  };
  observers: Array<{
    id: string;
    provider: string;
    weight: number;
    state: string;
  }>;
}
```

## 🏗️ Technical Stack
- **Framework**: Angular 18+ (Signals-based state).
- **Charts**: D3.js or Chart.js for consensus history.
- **Styling**: Vanilla CSS with CSS Variables for theme tokens.
- **Animations**: CSS Transitions for pulse and glow effects.

---
*Classification: 🛡️ SRE-INTERNAL (PHASE 0)*
*Status: DESIGN COMPLETE*
