// src/pipeline-types.ts
var JobStage = /* @__PURE__ */ ((JobStage2) => {
  JobStage2["PLAN"] = "PLAN";
  JobStage2["PLANNING"] = "PLANNING";
  JobStage2["GENERATE_CODE"] = "GENERATE_CODE";
  JobStage2["SECURITY"] = "SECURITY";
  JobStage2["MONETIZATION"] = "MONETIZATION";
  JobStage2["DEPLOYMENT"] = "DEPLOYMENT";
  JobStage2["MONITORING"] = "MONITORING";
  JobStage2["BUILD"] = "BUILD";
  JobStage2["TEST"] = "TEST";
  JobStage2["WRITE_ARTIFACTS"] = "WRITE_ARTIFACTS";
  JobStage2["VALIDATE_ARTIFACTS"] = "VALIDATE_ARTIFACTS";
  JobStage2["START_PREVIEW"] = "START_PREVIEW";
  JobStage2["HEALTH_CHECK"] = "HEALTH_CHECK";
  JobStage2["REGISTER_PREVIEW"] = "REGISTER_PREVIEW";
  JobStage2["COMPLETE"] = "COMPLETE";
  JobStage2["FAILED"] = "FAILED";
  return JobStage2;
})(JobStage || {});

// src/task.ts
var StageState = /* @__PURE__ */ ((StageState2) => {
  StageState2["IDLE"] = "IDLE";
  StageState2["RUNNING"] = "RUNNING";
  StageState2["COMPLETED"] = "COMPLETED";
  StageState2["FAILED"] = "FAILED";
  return StageState2;
})(StageState || {});
export {
  JobStage,
  StageState
};
//# sourceMappingURL=index.mjs.map