# External Auditor Guide (V1.0)

## 1. Audit Mandate
As an external institutional auditor, your role is to independently verify that ZTAN governance actions were authorized, constitutional, and correctly anchored to the global trust root.

## 2. Verification Workflow
1. **Request Evidence Pack**: Obtain the `EvidencePack` JSON for the event in question.
2. **Replay Replay**: Use the Independent Audit Simulator (`ztanctl audit replay`) to reconstruct the event logic.
3. **Verify Lineage**: Inspect the sequential governance lineage to ensure no "gaps" or unauthorized transitions exist.
4. **Anchor Audit**: Verify the Merkle inclusion proof against the public trust anchor.

## 3. Interpreting Decision Summaries
Decision summaries are generated in institutional language. They explain the **Constitutional Justification** for any emergency containment or stabilization. You should cross-reference these with the `CONSTITUTIONAL_HIERARCHY.md`.

## 4. Auditor Independence
Trust in ZTAN does not require contact with the developers. The system is designed to be **Forensically Complete**, meaning all information required for a full audit is contained within the evidence packs and the public anchor history.
