"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.request = exports.sleep = exports.CORE_API_URL = exports.GATEWAY_URL = void 0;
const axios_1 = __importDefault(require("axios"));
exports.GATEWAY_URL = process.env.GATEWAY_URL || "http://127.0.0.1:4080";
exports.CORE_API_URL = process.env.CORE_API_URL || "http://127.0.0.1:3001";
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
exports.sleep = sleep;
const request = async (url, method = "GET", data = null, token = "") => {
    try {
        const res = await (0, axios_1.default)({
            url: (url.startsWith('http') ? '' : exports.GATEWAY_URL) + url,
            method,
            data,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            timeout: 10000
        });
        return res.data;
    }
    catch (err) {
        console.error(`[P14-ERR] ${method} ${url} FAILED:`, err?.response?.status || err.message);
        return null;
    }
};
exports.request = request;
//# sourceMappingURL=utils.js.map