module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'Circular dependencies are not allowed.',
      from: {},
      to: { circular: true }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'This module is not used by any other module.',
      from: { orphan: true },
      to: {}
    },
    {
      name: 'no-cross-layer-memory',
      severity: 'error',
      comment: 'memory-core should not depend on memory-vector or memory-cache.',
      from: { path: '^packages/memory-core' },
      to: { path: '^packages/memory-(vector|cache)' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.base.json'
    }
  }
};
