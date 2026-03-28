"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  JobStage: () => JobStage,
  StageState: () => StageState
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JobStage,
  StageState
});
//# sourceMappingURL=index.js.map