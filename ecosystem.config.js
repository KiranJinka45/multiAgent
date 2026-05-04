module.exports = {
  apps: [
    {
      name: "LOG-SERVICE",
      script: "index.js",
      cwd: "./services/log-service",
      watch: false,
      env: { PORT: 4003 }
    },
    {
      name: "AUTH-SERVICE",
      script: "index.js",
      cwd: "./services/auth-service",
      watch: false,
      env: { PORT: 4004 }
    },
    {
      name: "MISSION-SERVICE",
      script: "index.js",
      cwd: "./services/mission-service",
      watch: false,
      env: { PORT: 4001 }
    },
    {
      name: "AGENT-SERVICE",
      script: "index.js",
      cwd: "./services/agent-service",
      watch: false,
      env: { PORT: 4002 }
    },
    {
      name: "API-GATEWAY",
      script: "server.js",
      cwd: "./api-gateway",
      watch: false,
      env: { PORT: 4000 }
    },
    {
      name: "FRONTEND",
      script: "npm",
      args: "run dev",
      cwd: "./apps/frontend",
      watch: false,
      env: { PORT: 3006 }
    }
  ]
};
