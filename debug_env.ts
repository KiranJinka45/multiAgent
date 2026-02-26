import { env } from './src/config/env';
console.log("env.NODE_ENV:", env.NODE_ENV);
console.log("process.env.GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);
console.log("process.env.NEXT_PUBLIC_SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
