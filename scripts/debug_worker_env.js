"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
console.log("Checking GROQ_API_KEY with .env.local via dotenv.config()...");
const apiKey = process.env.GROQ_API_KEY;
if (apiKey) {
    console.log("✅ GROQ_API_KEY found:", apiKey.substring(0, 8) + "...");
}
else {
    console.log("❌ GROQ_API_KEY NOT FOUND");
}
console.log("process.env keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY")));
//# sourceMappingURL=debug_worker_env.js.map