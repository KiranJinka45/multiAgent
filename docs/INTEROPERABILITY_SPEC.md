# ZTAN Interoperability Specification

This document defines the protocols and standards ZTAN uses to participate in the global enterprise ecosystem.

## 1. Identity Standards
- **W3C Verifiable Credentials (VC)**: Institutional roles and authority are expressed as standard VCs, enabling cross-platform trust.
- **SPIFFE/SPIRE**: Service-to-service authentication is aligned with SPIFFE IDs, allowing ZTAN nodes to integrate with zero-trust meshes (Istio, Linkerd).

## 2. Observability Standards
- **OpenTelemetry (OTLP)**: All longitudinal telemetry and runtime spans are exported via OTLP, ensuring visibility in standard stacks (Jaeger, Prometheus, Grafana).
- **CloudEvents**: Asynchronous governance events follow the CNCF CloudEvents specification for event-driven interoperability.

## 3. Infrastructure & Deployment
- **Kubernetes Operator**: Native lifecycle management for ZTAN nodes within K8s clusters.
- **Terraform Providers**: (Future) Primitives for Infrastructure-as-Code (IaC) management of ZTAN federation nodes.

## 4. OCI Compatibility
- **Container Registry**: ZTAN runtime images and institutional artifacts follow OCI distribution and image specifications.
