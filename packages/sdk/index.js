"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = exports.InternalSDK = void 0;
const axios_1 = __importDefault(require("axios"));
class InternalSDK {
    gatewayUrl;
    constructor(gatewayUrl = '/api') {
        this.gatewayUrl = gatewayUrl;
    }
    async login(email, password) {
        const res = await axios_1.default.post(`${this.gatewayUrl}/auth/login`, { email, password });
        return res.data;
    }
    async startBuild(token, prompt, projectId, executionId) {
        const res = await axios_1.default.post(`${this.gatewayUrl}/build`, { prompt, projectId, executionId }, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
    }
    async createCheckout(token, plan) {
        const res = await axios_1.default.post(`${this.gatewayUrl}/billing/checkout`, { plan }, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
    }
}
exports.InternalSDK = InternalSDK;
exports.sdk = new InternalSDK();
//# sourceMappingURL=index.js.map