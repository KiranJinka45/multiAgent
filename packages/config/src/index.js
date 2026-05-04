"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS_DEVELOPMENT = exports.IS_PRODUCTION = exports.config = exports.SecretProvider = void 0;
__exportStar(require("./frontend"), exports);
__exportStar(require("./backend"), exports);
__exportStar(require("./env"), exports);
var secret_provider_1 = require("./secret-provider");
Object.defineProperty(exports, "SecretProvider", { enumerable: true, get: function () { return secret_provider_1.SecretProvider; } });
const backend_1 = require("./backend");
const env_1 = require("./env");
/**
 * Standard named exports for convenience.
 * Consumers should prefer 'serverConfig' or 'frontendConfig'
 * but we keep 'config' as an alias for the server config for backward compatibility.
 */
exports.config = backend_1.serverConfig;
exports.IS_PRODUCTION = env_1.env.NODE_ENV === 'production';
exports.IS_DEVELOPMENT = env_1.env.NODE_ENV === 'development';
//# sourceMappingURL=index.js.map