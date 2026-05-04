import OpenAI from "openai";
import { SystemIssue } from "./types";

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'mock-key-for-now' 
});

export async function proposeFix(issues: SystemIssue[]): Promise<string> {
  if (issues.length === 0) return "No issues found.";

  const issueDescriptions = issues.map(i => `[${i.type}] ${i.description} (Severity: ${i.severity})`).join("\n");

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o", // Upgraded from user's gpt-4.1 suggestion to standard 4o
      messages: [
        {
          role: "system",
          content: `You are a Principal System Architect for a complex TypeScript monorepo. 
          Analyze the following system issues and suggest specific architectural improvements. 
          Provide a clear, actionable plan for refactoring or optimization.`
        },
        {
          role: "user",
          content: `Detected Issues:\n${issueDescriptions}`
        }
      ]
    });

    return res.choices[0].message.content || "Failed to generate proposal.";
  } catch (error: any) {
    console.error("Architect Agent Error:", error.message);
    return `Error generating proposal: ${error.message}`;
  }
}

