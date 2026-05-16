# Decentralized Governance Roots Spec (v1.0)

## 1. Objective
Establish a robust, gossip-based protocol for synchronizing institutional governance roots across the global ZTAN network, ensuring that all sovereign nodes maintain a consistent view of the network's trust anchors without centralized coordination.

## 2. The ZTAN Gossip Protocol (ZGP)
- **Peer Discovery**: Nodes discover peers via signed **Bridge Handshake** advertisements.
- **Root Broadcasting**: When a federation signs a new Governance Root for Epoch N, it broadcasts a `RootUpdate` message to its direct bridge peers.
- **Relay Logic**: Peers verify the `RootUpdate` (signature + lineage) and relay it to their own peers until the entire network is reached.
- **Anti-Entropy**: Nodes periodically poll random peers to ensure they haven't missed updates (Pull-based recovery).

## 3. Conflict Resolution & Root Forks
In a decentralized network, a rogue or malfunctioning federation might attempt to propagate two different roots for the same epoch.

- **The Gold Rule**: Any node that receives two conflicting roots for the same `federationId` + `epochId` must immediately trigger a **Slashing Proof** generation and broadcast it.
- **Consensus through Slashing**: The network will autonomously reject any root involved in a verified Slashing Proof, ensuring convergence on the only valid (non-equivocated) root.

## 4. Propagation Health Metrics
- **Mean Time to Convergence (MTTC)**: The target time for 99% of the network to receive a root update (Goal: < 5 seconds).
- **Network Diameter**: The maximum number of hops between any two nodes in the global ZTAN bridge graph.

---
*Status: Draft V1.0 - ZTAN V2.1 Decentralization Layer*
