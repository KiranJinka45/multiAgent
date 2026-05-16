# ZTAN Operator Onboarding Manual (V4.0)

## 1. Introduction
Welcome to the Nexus ZTAN Institutional Infrastructure. As an operator, your role is to monitor and verify the network's governance health. You are not just managing code; you are maintaining a cryptographically final institution.

## 2. Constitutional Hierarchy Quick-Reference
| Level | Role | Responsibilities |
| --- | --- | --- |
| 1 | **Operator** | Routine monitoring, stake management. |
| 2 | **Auditor** | Security verification, breach reporting. |
| 3 | **Federated Quorum** | Governance stabilization, circuit breaker verification. |
| 4 | **Constitutional Anchor** | State restoration, global finality settlement. |

## 3. Essential CLI Commands
- `ztanctl governance summary`: High-level institutional health check.
- `ztanctl governance explain`: Plain-language narrative of recent events.
- `ztanctl constitution inspect`: Review authority levels and escalation rules.
- `ztanctl stake status`: Check your federation's trust weight and risk exposure.

## 4. Incident Response Workflow
1. **Identify**: Receive alert or see `DEGRADED`/`CRITICAL` status in `summary`.
2. **Interpret**: Run `governance explain` to understand the institutional reasoning.
3. **Verify**: Cross-reference with `constitution inspect` to ensure the action is authorized.
4. **Action**: If `CRITICAL`, coordinate with the Federated Quorum for `governance recover`.

## 5. The Golden Rule
**Institutional Survivability > Operational Speed.**
If the network enters stabilization (Circuit Breaker tripped), do not panic. The system is behaving as designed to prevent collapse. Prioritize correctness and auditability over immediate recovery.
