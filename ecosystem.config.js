module.exports = {
  apps: [
    {
      name: 'gateway',
      script: './apps/gateway/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'worker',
      script: './apps/worker/dist/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
