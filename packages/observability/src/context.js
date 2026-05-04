"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextStorage = void 0;
exports.getRequestId = getRequestId;
exports.getUserId = getUserId;
exports.getTenantId = getTenantId;
exports.getExecutionId = getExecutionId;
exports.getRequestContext = getRequestContext;
const async_hooks_1 = require("async_hooks");
exports.contextStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * Helper to get the current request ID from context
 */
function getRequestId() {
    return exports.contextStorage.getStore()?.requestId;
}
/**
 * Helper to get the current user ID from context
 */
function getUserId() {
    return exports.contextStorage.getStore()?.userId;
}
/**
 * Helper to get the current tenant ID from context
 */
function getTenantId() {
    return exports.contextStorage.getStore()?.tenantId;
}
/**
 * Helper to get the current execution ID from context
 */
function getExecutionId() {
    return exports.contextStorage.getStore()?.executionId;
}
/**
 * Helper to get the complete context
 */
function getRequestContext() {
    return exports.contextStorage.getStore();
}
//# sourceMappingURL=context.js.map