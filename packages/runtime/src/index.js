"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewWatchdog = exports.RuntimeStatus = exports.previewManager = exports.PreviewServerManager = exports.SandboxRunner = exports.ContainerManager = exports.PortManager = exports.DistributedExecutionContext = exports.patchVerifier = exports.VirtualFileSystem = exports.watchdog = void 0;
// Explicitly re-export bridge members to resolve ambiguity and satisfy dependents
var utils_1 = require("@packages/utils");
Object.defineProperty(exports, "watchdog", { enumerable: true, get: function () { return utils_1.watchdog; } });
Object.defineProperty(exports, "VirtualFileSystem", { enumerable: true, get: function () { return utils_1.VirtualFileSystem; } });
Object.defineProperty(exports, "patchVerifier", { enumerable: true, get: function () { return utils_1.patchVerifier; } });
Object.defineProperty(exports, "DistributedExecutionContext", { enumerable: true, get: function () { return utils_1.DistributedExecutionContext; } });
Object.defineProperty(exports, "PortManager", { enumerable: true, get: function () { return utils_1.PortManager; } });
Object.defineProperty(exports, "ContainerManager", { enumerable: true, get: function () { return utils_1.ContainerManager; } });
Object.defineProperty(exports, "SandboxRunner", { enumerable: true, get: function () { return utils_1.SandboxRunner; } });
Object.defineProperty(exports, "PreviewServerManager", { enumerable: true, get: function () { return utils_1.PreviewServerManager; } });
Object.defineProperty(exports, "previewManager", { enumerable: true, get: function () { return utils_1.previewManager; } });
Object.defineProperty(exports, "RuntimeStatus", { enumerable: true, get: function () { return utils_1.RuntimeStatus; } });
var watchdog_1 = require("./watchdog");
Object.defineProperty(exports, "PreviewWatchdog", { enumerable: true, get: function () { return watchdog_1.PreviewWatchdog; } });
//# sourceMappingURL=index.js.map