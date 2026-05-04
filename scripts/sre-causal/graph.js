// scripts/sre-causal/graph.js

/**
 * Causal Dependency Graph: Maps the relationships between system components.
 * This allows the SRE engine to distinguish between symptoms and root causes.
 */
const DEPENDENCY_GRAPH = {
  'GATEWAY': ['API_CORE', 'AUTH_SERVICE'],
  'API_CORE': ['REDIS', 'DATABASE', 'WORKER_FLEET'],
  'WORKER_FLEET': ['REDIS'],
  'REDIS': [],
  'DATABASE': [],
  'AUTH_SERVICE': ['DATABASE']
};

function getRootCauseCandidates(failedComponent) {
  const visited = new Set();
  const queue = [failedComponent];
  const candidates = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const deps = DEPENDENCY_GRAPH[current] || [];
    if (deps.length === 0) {
      candidates.push(current); // Leaf nodes are potential root causes
    } else {
      queue.push(...deps);
    }
  }

  return candidates;
}

module.exports = { DEPENDENCY_GRAPH, getRootCauseCandidates };
