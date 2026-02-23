You are now operating in PHASE 5.6: SILENT INTERNAL ALPHA (FOUNDER ABUSE MODE).

The system architecture is locked.
Feature Freeze remains active.
No new features allowed.
No stack expansion allowed.

Your objective is to survive intentional abuse by the founders.

------------------------------------------------
SECTION 1 — FOUNDER ABUSE MODE ENABLED
------------------------------------------------

Enable Internal Abuse Mode:

- Disable public-facing safeguards.
- Allow messy, ambiguous, oversized, conflicting specs.
- Log every abnormal behavior.
- Do NOT auto-correct user intent.
- Do NOT silently fix architect ambiguity.

Instead:
- Track failure points.
- Track where validation logic breaks.
- Track retry explosion patterns.

------------------------------------------------
SECTION 2 — EDGE CASE TRACKING
------------------------------------------------

Create an internal tracking system for:

1. Architect ambiguity failures
2. Patch recursion depth > 2
3. Token spike anomalies
4. Deployment rollback triggers
5. Template guard violations
6. Concurrency lockups
7. Docker timeout events
8. Log trimmer misclassification

Store all in:
internal_abuse_logs table.

------------------------------------------------
SECTION 3 — FAILURE CLASSIFICATION UPGRADE
------------------------------------------------

Every failed build must return structured failure:

{
  "stage_failed": "",
  "error_category": "",
  "retry_count": "",
  "token_usage": "",
  "root_cause_hypothesis": "",
  "system_guard_triggered": true/false
}

No raw stack traces.

------------------------------------------------
SECTION 4 — STABILITY SCORE DURING ABUSE
------------------------------------------------

Compute:

Abuse Stability Score (ASS):

ASS =
(0.5 × BuildSurvivalRate) +
(0.2 × DeploymentSurvivalRate) +
(0.15 × RetryControlScore) +
(0.15 × TokenStabilityScore)

Target:
ASS ≥ 0.75 before human alpha.

------------------------------------------------
SECTION 5 — TIME-BOUND TEST WINDOW
------------------------------------------------

Silent Internal Alpha duration: 3–5 days.

During this window:

- Founders intentionally create broken specs.
- Founders overload concurrency.
- Founders attempt repeated generation.
- Founders test boundary inputs.

No architecture upgrades allowed.
Only logging + analysis.

------------------------------------------------
SECTION 6 — OUTPUT REQUIREMENTS
------------------------------------------------

Provide:

1. Internal abuse logging schema
2. Abuse Stability Score calculator
3. Daily internal report template
4. Failure clustering strategy
5. Tightening recommendations if ASS < 0.75

System priority:
Survive chaos from founders.
Fail gracefully.
Never hang.
Never infinite loop.
Never exceed token guard.

End goal:
If system survives founders for 5 days,
it may survive real alpha users.
