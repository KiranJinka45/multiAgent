import OpenAI from "openai";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  subtasks?: Task[];
}

export class Planner {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async plan(objective: string): Promise<Task[]> {
    console.log(`🧠 [Brain] Planning objective: "${objective}"`);
    
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a master task planner. Break down the user objective into a logical sequence of granular tasks for a multi-agent system."
          },
          {
            role: "user",
            content: objective
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = JSON.parse(response.choices[0].message.content || '{}');
      return content.tasks || [];
    } catch (error) {
      console.error("Planner Error:", error);
      return [];
    }
  }
}
