# Runbook: Read-Only Degradation 

## 1. Trigger Condition
A component is placed into the `READ_ONLY` state either by automation responding to heavy load or an operator attempting to preserve a failing service.

## 2. System Semantics (Frozen Constraints)
* The component continues to serve `OBSERVE` traffic.
* `CONTROLLED_MUTATION` and `QUORUM_MUTATION` traffic destined for this component is rejected with `MUTATION_BLOCKED_READONLY`.

## 3. Execution Workflow
1. Identify the root cause of the degradation via the `sre-cockpit`.
2. Once the underlying pressure (e.g., massive traffic spike) has subsided, the node can be transitioned back to `ACTIVE`.
3. If the node was placed into `READ_ONLY` due to storage exhaustion, expand the underlying storage volume via Terraform before transitioning back to `ACTIVE`.
4. Only operators with `SRE_ADMIN` role can execute the `READ_ONLY` $\rightarrow$ `ACTIVE` transition.
