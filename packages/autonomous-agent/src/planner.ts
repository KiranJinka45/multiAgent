import OpenAI from 'openai';
import { logger } from '@libs/utils';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function planFeature(prompt: string) {
  logger.info({ prompt }, 'Planning feature with AI...');
  
  if (!process.env.OPENAI_API_KEY) {
    logger.warn('OPENAI_API_KEY not found. Using stub planner.');
    return "Stub plan: Create index.ts and run validate.";
  }

  const res = await client.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a Principal Architect. Break feature requests into detailed backend, frontend, and database tasks for a monorepo. Output as JSON."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(res.choices[0].message.content || '{}');
}
