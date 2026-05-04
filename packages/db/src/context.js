"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantId = exports.getRequestId = exports.contextStorage = void 0;
/**
 * Request Context Re-export
 * Centralized in @packages/observability to prevent circular dependencies.
 *
 * NOTE: We use explicit re-exports (not `export *`) to prevent tsc
 * --emitDeclarationOnly from resolving observability source files,
 * which would violate the rootDir constraint during Docker builds.
 */
var observability_1 = require("@packages/observability");
Object.defineProperty(exports, "contextStorage", { enumerable: true, get: function () { return observability_1.contextStorage; } });
Object.defineProperty(exports, "getRequestId", { enumerable: true, get: function () { return observability_1.getRequestId; } });
Object.defineProperty(exports, "getTenantId", { enumerable: true, get: function () { return observability_1.getTenantId; } });
//# sourceMappingURL=context.js.map