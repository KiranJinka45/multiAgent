"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
console.log("env.NODE_ENV:", env_1.env.NODE_ENV);
console.log("process.env.GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
console.log("process.env.NEXT_PUBLIC_SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
//# sourceMappingURL=debug_env.js.map