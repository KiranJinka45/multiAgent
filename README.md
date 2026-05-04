# ZTAN: Zero-Trust Audit Network (Enterprise)

[![ZTAN Status](https://img.shields.io/badge/ZTAN-OPERATIONAL-success?style=flat-square)](https://ztan-backend.onrender.com/api/v1/ztan/metrics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**ZTAN** is a production-hardened, distributed cryptographic infrastructure for verifiable financial oversight and system integrity. It utilizes Multi-Party Computation (MPC) and BLS12-381 threshold signatures to provide non-repudiable audit trails.

## 🚀 Live Demo
- **Public Dashboard**: [ztan-demo.vercel.app/ztan/trust](https://ztan-demo.vercel.app/ztan/trust)
- **Financial Approval Demo**: [ztan-demo.vercel.app/demo/financial-approval](https://ztan-demo.vercel.app/demo/financial-approval)

## 🏗️ Architecture
ZTAN operates as a decentralized network of validator nodes that orchestrate cryptographic ceremonies:
1.  **DKG (Distributed Key Generation)**: Nodes generate a shared master public key without any single party knowing the private key.
2.  **Threshold Signing**: A 2/3 majority of nodes must sign a payload (e.g., a financial request) to generate a valid aggregate proof.
3.  **Audit Persistence**: All proofs are archived in a persistent PostgreSQL database and verifiable via the public ZTAN API.

## 🛠️ Deployment Guide

### Backend (Render)
The backend is orchestrated via `render.yaml`. It includes:
- **Core API**: The central cryptographic engine.
- **PostgreSQL**: Persistent storage for identity and proofs.
- **Redis**: Real-time coordination for MPC ceremonies.

**Steps**:
1. Connect your GitHub fork to [Render](https://render.com).
2. Choose **Blueprint** and select the repository.
3. Render will auto-provision the database and API.

### Frontend (Vercel)
The Angular application is optimized for Vercel deployment.
- **Build Command**: `pnpm build`
- **Output Directory**: `dist/frontend/browser`

**Steps**:
1. Connect your repository to [Vercel](https://vercel.com).
2. Set the **Root Directory** to `apps/frontend`.
3. Deploy.

## 🧪 Post-Deployment Verification
Run the cloud validation suite from your local machine:
```bash
npm install
npm run validate:cloud
```

## 🔒 Security Posture
- **RFC-001 v1.4 Compliant**: Canonical binary encoding for cross-runtime parity (Node.js & Python).
- **Threshold Security**: No single point of failure; requires consensus.
- **SRE Hardened**: Includes circuit breakers, load-shedding, and persistent audit logs.

---
© 2026 MultiAgent Enterprise. All Rights Reserved.
