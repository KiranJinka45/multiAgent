"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yjs_server_1 = require("../apps/api/src/services/yjs-server");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
dotenv_1.default.config();
const port = 3011;
console.log('🚀 Starting Standalone Yjs Server...');
(0, yjs_server_1.startCollaborationServer)(port);
// Keep alive
process.stdin.resume();
//# sourceMappingURL=standalone-yjs-server.js.map