// scripts/global-validation/config.js
module.exports = {
  regions: [
    "http://localhost:4080",
    "http://localhost:4081" // Mocking a second region on a different port
  ],
  redis: {
    host: "localhost",
    port: 6379
  },
  missionId: "global-test-mission-" + Date.now(),
  stepKey: "BUILD_STEP"
};
