# ZTAN-RFC-002: Distributed Key Generation and Threshold Signing (FROST)

**Version:** 1.0 (PROPOSED)  
**Status:** Validated Coordinated MPC  
**Authors:** ZTAN Cryptography Working Group  

## 1. Abstract
This document specifies the Distributed Key Generation (DKG) and Threshold Signing protocol for the Zero-Trust Audit Network (ZTAN). It utilizes the **FROST** (Flexible Round-Optimized Schnorr Threshold) signature scheme, adapted for the **BLS12-381** curve.

## 2. Security Model & Trust Boundary
ZTAN-RFC-002 operates under a **Coordinated Execution Model**.

### 2.1 Assumptions
- **Honest Majority**: At least `t` (threshold) participants must be honest.
- **Trusted-for-Sequencing Coordinator**: The central coordinator (TssCeremonyService) is trusted to sequence rounds, aggregate contributions, and broadcast results correctly. It is **NOT** trusted with secret keys.

### 2.2 Security Limitations (MANDATORY DISCLOSURE)
Auditors must be aware of the following residual risks in this version:
1. **No Authenticated P2P Channels**: Participants communicate via the coordinator. Without node-to-node authenticated channels, a malicious coordinator could perform man-in-the-middle attacks on secret shares if they are not independently encrypted (not implemented in v1.0).
2. **No Complaint Protocol**: This version does not implement a full interactive complaint/dispute sub-protocol. Any detected fraud (invalid VSS share, invalid commitment) results in an immediate **Ceremony Abort**.
3. **No Byzantine Fault Tolerance (BFT)**: The system does not guarantee liveness under Byzantine conditions. A single malicious participant can stall or abort the ceremony.

## 3. Distributed Key Generation (DKG)
Based on Pedersen's DKG, requiring two rounds.

### 3.1 Round 1: Commitment Phase
Each participant $P_i$:
1. Generates a random polynomial $f_i(x)$ of degree $t-1$.
2. Calculates commitments $C_{i,j} = g^{a_{i,j}}$ for all coefficients.
3. Broadcasts $(C_{i,0}, \dots, C_{i,t-1})$.

### 3.2 Round 2: Share Exchange Phase
Each participant $P_i$:
1. Calculates shares $s_{i,j} = f_i(j)$ for each participant $P_j$.
2. Submits shares to the coordinator for distribution.
3. Upon receiving shares $s_{j,i}$ from all other participants, verifies:
   $g^{s_{j,i}} \stackrel{?}{=} \prod_{k=0}^{t-1} (C_{j,k})^{i^k}$

## 4. Threshold Signing
Utilizes the FROST one-round (with pre-processing) or two-round signing flow.

### 4.1 Signing Round 1: Nonce Generation
Each participant generates one-time nonces (not implemented in simulation; currently uses direct share signing for simplicity, following RFC-001 v1.5 aggregation).

## 5. Abort Conditions
The ceremony **MUST** be aborted if any of the following occur:
- Any participant fails to submit valid commitments in Round 1.
- Any participant fails to submit valid shares in Round 2.
- Any VSS verification check fails.
- Any participant signature on a contribution is invalid.

## 6. Implementation Notes
- **Curve**: BLS12-381.
- **Hashing**: SHA-256 for binding.
- **Encoding**: Canonical Encoding Rules (CER v1.5).
