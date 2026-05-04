import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log("Checking GROQ_API_KEY with .env.local via dotenv.config()...");
const apiKey = process.env.GROQ_API_KEY;
if (apiKey) {
    console.log("✅ GROQ_API_KEY found:", apiKey.substring(0, 8) + "...");
} else {
    console.log("❌ GROQ_API_KEY NOT FOUND");
}
console.log("process.env keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY")));

