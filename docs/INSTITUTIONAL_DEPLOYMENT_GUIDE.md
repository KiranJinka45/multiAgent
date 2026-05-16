# Institutional Deployment Guide (V1.0)

## 1. Objective
Enable low-friction, safe deployment of ZTAN institutional infrastructure via opinionated defaults and preflight validation.

## 2. Deployment Profiles
Choose the profile that best matches your organization's role:
- **Financial**: Balanced stability and liquidity for regulated entities.
- **Sovereign**: Maximum survivability for national/state actors.
- **Enterprise**: Observability-focused for internal automation.

## 3. Step-by-Step Onboarding
1. **Initialize**: `ztanctl deploy init <profile>`. This generates your deployment configuration and locks the governance safeguards.
2. **Validate**: `ztanctl deploy validate`. Performs the "Preflight Check" to ensure all systems (Containment, Audit, Integrity) are operational.
3. **Certify**: `ztanctl deploy certify`. Formally issues your Institutional Certification and prepares the environment for production.
4. **Explain**: `ztanctl deploy explain`. Review the institutional reasoning behind your locked configuration.

## 4. Safety & Governance
By default, the system enforces **Strict Governance Mode**. This means:
- Slashing is throttled to 5% per epoch.
- Containment triggers at lower risk thresholds.
- Dual-quorum is mandatory for recovery.
- These settings can be audited but not easily bypassed, protecting the institution from onboarding error.
