# Hardware Root-of-Trust Specification

This document defines the requirements and procedures for anchoring ZTAN institutional trust in physical hardware roots and confidential computing environments.

## 1. Hardware-Backed Identities (TPM/HSM)
- **Key Isolation**: Mission-critical signing keys (Governance Roots) must be stored in TPM 2.0 or HSM modules.
- **Hardware Signing**: All institutional state transitions must be signed within a hardware module to prevent key extraction.

## 2. Confidential Computing (Enclaves)
- **Remote Attestation**: Every federation node must provide a signed attestation report (PCR hashes) from an AWS Nitro or Intel SGX enclave.
- **Memory Isolation**: Institutional workloads must run in memory-isolated enclaves to protect against side-channel and cold-boot attacks.

## 3. Post-Quantum Cryptography (PQC)
- **Algorithm Agility**: Support for NIST-standardized PQC algorithms (Dilithium for signatures, Kyber for KEM).
- **Decadal Finality**: Transitioning the platform to PQC-hardened roots to survive the arrival of cryptographically relevant quantum computers (CRQCs).
