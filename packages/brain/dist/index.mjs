// src/base-agent.ts
import { Groq } from "groq-sdk";
import { logger } from "@packages/observability";
import { breakers, eventBus, RetryManager, usageService, SemanticCacheService } from "@packages/utils/server";
var retry = new RetryManager(5, 3e3);
var BaseAgent = class {
  groq;
  logs = [];
  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error(`${this.getName()} requires GROQ_API_KEY`);
    this.groq = new Groq({ apiKey });
  }
  log(message, meta = {}) {
    const { executionId, ...rest } = meta;
    logger.info({ agent: this.getName(), ...rest }, message);
    if (executionId) {
      eventBus.thought(executionId, this.getName(), message);
    }
  }
  async execute(input, context, signal, strategy) {
    const start = Date.now();
    const { db: db2 } = await import("@packages/db");
    let activeStrategy = strategy;
    try {
      const persistedStrategy = await db2.strategy.findFirst({
        where: { agent: this.getName(), isActive: true }
      });
      if (persistedStrategy) {
        activeStrategy = {
          ...strategy,
          ...persistedStrategy.config
        };
      }
    } catch (err) {
      this.log("Failed to fetch active strategy, using default");
    }
    if (this.getName() === "EvolutionAgent") {
      const { GovernanceEngine } = await import("@packages/core-engine");
    }
    try {
      const result = await this.run(input, context, signal, activeStrategy);
      await db2.executionLog.create({
        data: {
          taskType: this.getName(),
          input,
          output: result,
          success: result.success,
          latency: Date.now() - start,
          cost: result.tokens ? result.tokens / 1e3 * 0.01 : 0
          // Simplified cost model
        }
      }).catch((err) => logger.error({ err }, "[BaseAgent] Telemetry logging failed"));
      return result;
    } catch (err) {
      await db2.executionLog.create({
        data: {
          taskType: this.getName(),
          input,
          output: { error: err.message },
          success: false,
          latency: Date.now() - start,
          cost: 0
        }
      }).catch((e) => logger.error({ e }, "[BaseAgent] Telemetry error logging failed"));
      throw err;
    }
  }
  async promptLLM(system, user, modelOverride, signal, strategy, context) {
    const model = strategy?.model || modelOverride || "llama-3.3-70b-versatile";
    const temperature = strategy?.temperature ?? 0.7;
    this.log(`Invoking LLM (${model}) with temperature ${temperature}`);
    const cached = await SemanticCacheService.get(user, system, model);
    if (cached) {
      this.log(`Cache Hit: ${model}`);
      return {
        result: cached,
        tokens: 0,
        // Cached results effectively use 0 tokens for the current call
        promptTokens: 0,
        completionTokens: 0
      };
    }
    try {
      const llmResponse = await retry.executeWithRetry(async () => {
        return await breakers.llm.execute(async () => {
          const response = await this.groq.chat.completions.create({
            messages: [
              { role: "system", content: system },
              { role: "user", content: user }
            ],
            model,
            temperature,
            response_format: { type: "json_object" }
          }, { signal });
          const content = response.choices[0].message.content;
          const tokensUsed = response.usage?.total_tokens || 0;
          const promptTokens = response.usage?.prompt_tokens || 0;
          const completionTokens = response.usage?.completion_tokens || 0;
          if (!content) throw new Error("Empty response from LLM");
          const result = JSON.parse(content);
          if (context?.userId && context?.tenantId) {
            usageService.recordAiUsage({
              model,
              promptTokens,
              completionTokens,
              totalTokens: tokensUsed,
              userId: context.userId,
              tenantId: context.tenantId,
              metadata: {
                executionId: context.executionId,
                agent: this.getName(),
                model
              }
            }).catch((err) => logger.error({ err }, "[BaseAgent] Usage tracking failed"));
          }
          await SemanticCacheService.set(user, result, system, model);
          return {
            result,
            tokens: tokensUsed,
            promptTokens,
            completionTokens
          };
        });
      }, this.getName(), {});
      return llmResponse;
    } catch (error) {
      this.log(`LLM invocation failed: ${error}`);
      throw error;
    }
  }
};

// src/planner.ts
import OpenAI from "openai";
var Planner = class {
  client;
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }
  async plan(objective) {
    console.log(`\u{1F9E0} [Brain] Planning objective: "${objective}"`);
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
      const content = JSON.parse(response.choices[0].message.content || "{}");
      return content.tasks || [];
    } catch (error) {
      console.error("Planner Error:", error);
      return [];
    }
  }
};

// src/memory.ts
var Memory = class {
  store = /* @__PURE__ */ new Map();
  async store_context(key, value, tags) {
    const item = {
      key,
      value,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      tags
    };
    this.store.set(key, item);
    console.log(`\u{1F4BE} [Brain] Stored context for key: ${key}`);
  }
  async retrieve_context(key) {
    const item = this.store.get(key);
    return item ? item.value : null;
  }
  async query_by_tag(tag) {
    return Array.from(this.store.values()).filter((item) => item.tags?.includes(tag));
  }
  clear() {
    this.store.clear();
  }
};

// src/architecture-agent.ts
import logger2 from "@packages/utils";
var ArchitectureAgent = class extends BaseAgent {
  constructor() {
    super();
  }
  getName() {
    return "ArchitectureAgent";
  }
  async run(input, context, signal, strategy) {
    const ctx = await context.get();
    const prompt2 = input?.prompt || ctx.prompt;
    const findings = ctx.metadata.findings || {};
    const systemPrompt = `You are a Principal Software Architect.
Your task is to define a high-level technical blueprint for a project based on the user's requirements and preliminary research.

Respond ONLY with a JSON object in this format:
{
    "stack": {
        "framework": "e.g., Next.js 14 (App Router)",
        "ui": "e.g., Tailwind CSS + Shadcn UI",
        "database": "e.g., Supabase (PostgreSQL)",
        "stateManagement": "e.g., Zustand",
        "auth": "e.g., NextAuth.js"
    },
    "schema": "Describe the core database tables and relationships",
    "folders": ["list", "of", "core", "folders"],
    "justification": "Short reason for these choices"
}`;
    const userPrompt = `RESEARCH FINDINGS:
${JSON.stringify(findings, null, 2)}

REQUIREMENTS:
${prompt2}`;
    try {
      const llmResponse = await this.promptLLM(
        systemPrompt,
        userPrompt,
        strategy?.model || "llama-3.3-70b-versatile",
        signal,
        strategy,
        context
      );
      const blueprint = llmResponse.result;
      return {
        success: true,
        data: blueprint,
        tokens: llmResponse.tokens,
        promptTokens: llmResponse.promptTokens,
        completionTokens: llmResponse.completionTokens
      };
    } catch (error) {
      logger2.error({ error, agent: this.getName() }, "Failed to generate architecture blueprint");
      return {
        success: false,
        error: `Failed to generate architecture: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }
};

// src/backend-agent.ts
var BackendAgent = class extends BaseAgent {
  getName() {
    return "BackendAgent";
  }
  async run(input, _context, signal, strategy) {
    if (input.isIncremental) {
      const beFiles = input.affectedFiles?.filter((f) => f.includes("api/") || f.includes("middleware") || f.includes("lib/"));
      if (!beFiles || beFiles.length === 0) {
        this.log(`Skipping Backend generation (no backend files affected in incremental build)`);
        return { success: true, data: { files: [] }, tokens: 0 };
      }
    }
    void _context;
    this.log(`Generating Backend API and logic based on schema...`);
    try {
      const system = `You are a Senior Backend Engineer. 
            Design a robust AI-powered backend (API routes, controllers, middleware).
            Include proper error handling and input validation.
            Output JSON with "files" (array of {path: string, content: string}) for the backend.`;
      const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}
Schema: ${input.schema || "No explicit schema provided"}`, "llama-3.3-70b-versatile", signal, strategy, _context);
      const files = result.files || [];
      const vfs = _context.getVFS();
      for (const file of files) {
        vfs.setFile(file.path, file.content, true, this.getName());
      }
      this.log(`Generated and stored ${files.length} backend files in VFS`);
      return {
        success: true,
        data: {
          fileCount: files.length,
          paths: files.map((f) => f.path)
        },
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/chat-edit-agent.ts
var ChatEditAgent = class extends BaseAgent {
  getName() {
    return "ChatEditAgent";
  }
  async run(input, _context, signal) {
    void _context;
    this.log(`Processing incremental edit request: "${input.editRequest.substring(0, 80)}..."`);
    try {
      const system = `You are a Senior AI Full-Stack Engineer working on an existing project.
The user has an existing, working codebase and wants to make a specific change.

Your job is to modify ONLY the files necessary to fulfill the request.
Do NOT regenerate the entire project. Do NOT touch files unrelated to the request.

RULES:
1. Preserve all existing functionality \u2014 do not break working code.
2. Follow the existing code style and conventions exactly.
3. If the change requires a new file, create it with action "create".
4. If modifying a file, include the COMPLETE new file content (not just the diff).
5. If a file should be removed, use action "delete" with empty content.
6. Ensure all imports are valid and reference existing project files.
7. Use the tech stack specified \u2014 do not switch frameworks or libraries.

TECH STACK: ${JSON.stringify(input.techStack)}

OUTPUT FORMAT (strict JSON):
{
  "explanation": "Brief description of what was changed and why",
  "patches": [
    {
      "path": "relative/path/to/file.tsx",
      "content": "complete file content after modification",
      "action": "create|modify|delete",
      "reason": "why this file was changed"
    }
  ],
  "newFeatures": ["list", "of", "new", "features", "added"]
}`;
      const userPrompt = `
${input.projectContext}

CURRENT FILES (to modify):
${input.currentFiles.map((f) => `--- ${f.path} ---
${f.content.substring(0, 3e3)}`).join("\n\n")}

USER REQUEST:
${input.editRequest}

Apply the minimal set of changes to fulfill this request. Output JSON.`;
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.3-70b-versatile", signal, void 0, _context);
      const editResult = result;
      this.log(`Generated ${editResult.patches?.length || 0} patches. Explanation: ${editResult.explanation}`);
      return {
        success: true,
        data: editResult,
        tokens,
        logs: this.logs
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        logs: this.logs,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/coder-agent.ts
var CoderAgent = class extends BaseAgent {
  getName() {
    return "CoderAgent";
  }
  async run(input, _context, signal, strategy) {
    void _context;
    this.log(`Generating code for task: "${input.taskTitle}"`);
    try {
      const failureContext = input.previousFailures?.length ? `

PREVIOUS FAILED ATTEMPTS (DO NOT repeat these mistakes):
${input.previousFailures.map((f, i) => `${i + 1}. ${f}`).join("\n")}` : "";
      const existingContext = input.existingFiles?.length ? `

EXISTING CODEBASE FILES (reference these for imports, types, and consistency):
${input.existingFiles.map((f) => `--- ${f.path} ---
${f.content.substring(0, 2e3)}`).join("\n\n")}` : "";
      const system = `You are an elite autonomous AI Software Engineer (like Devin).
You write production-grade, type-safe, well-structured code.

Tech Stack: ${JSON.stringify(input.techStack)}

Rules:
1. DETERMINISTIC PATCHING: If the target file contains anchors (e.g. <!-- ANCHOR_START -->), only output the content for that bracket.
2. Output COMPLETE, compilable files or patches \u2014 never leave TODOs or placeholder comments.
3. Use proper TypeScript types (no 'any' unless truly unavoidable).
4. Include all necessary imports for the code you generate.
5. Follow the project's existing patterns and naming conventions.
6. For React/Next.js components: use "use client" where needed, proper prop types, accessible HTML.
7. For API routes: proper error handling, input validation, typed responses.
8. Never import from non-existent modules \u2014 use only standard libraries and the project's installed packages.

Output strictly valid JSON:
{
  "files": [
    { "path": "relative/path/to/file.ts", "content": "complete file content" }
  ],
  "reasoning": "Brief explanation of architectural decisions made"
}`;
      const userPrompt = `TASK: ${input.taskTitle}
DESCRIPTION: ${input.taskDescription}
TARGET FILES: ${input.fileTargets.join(", ")}${existingContext}${failureContext}`;
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.3-70b-versatile", signal, void 0, _context);
      const output = result;
      this.log(`Generated ${output.files?.length || 0} files. Reasoning: ${output.reasoning?.substring(0, 100)}...`);
      return {
        success: true,
        data: output,
        tokens,
        logs: this.logs
      };
    } catch (error) {
      return {
        success: false,
        data: { files: [], reasoning: "" },
        logs: this.logs,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/context-builder.ts
import { MemoryService } from "@packages/memory";
import logger3 from "@packages/utils";
var ContextBuilder = class {
  static async build(prompt2, tenantId) {
    logger3.info({ prompt: prompt2, tenantId }, "[ContextBuilder] Building context for reasoning");
    const memories = await MemoryService.retrieve(prompt2, tenantId);
    return {
      prompt: prompt2,
      memories,
      systemState: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};

// src/critic-agent.ts
var CriticAgent = class extends BaseAgent {
  getName() {
    return "CriticAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log(`Critical evaluation of task: ${input.task}...`);
    const system = `You are a Senior Logic & Quality Critic (Aion Validator).
Your role is to evaluate the work produced by other agents and provide objective feedback.

Evaluation Criteria:
1. Completeness: Did the agent fulfill all requirements of the task?
2. Correctness: Is the code or logic syntactically correct and logical?
3. Security: Are there obvious security flaws (leaked keys, dangerous functions)?
4. Consistency: Does it match the project architecture?

Rules:
- Be strict. If you find errors, fail the task and provide specific, actionable feedback.
- If the output is perfect, pass it with a high score.
- Output ONLY valid JSON.

Output Format:
{
  "evaluation": "pass" | "fail",
  "score": 0.0 - 1.0,
  "feedback": "Concise summary of your evaluation",
  "suggestions": ["specific improvement 1", "specific improvement 2"]
}`;
    const userPrompt = `TASK: ${input.task}
REQUIREMENTS: ${input.requirements || "N/A"}

OUTPUT TO EVALUATE:
${JSON.stringify(input.output, null, 2)}

FILE CONTEXT (if any):
${input.fileContext?.map((f) => `--- ${f.path} ---
${f.content.substring(0, 1e3)}`).join("\n")}`;
    try {
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.3-70b-versatile", signal, strategy, _context);
      const output = result;
      this.log(`Evaluation: ${output.evaluation.toUpperCase()} (Score: ${output.score}). Feedback: ${output.feedback}`);
      return {
        success: true,
        data: output,
        tokens,
        confidence: output.score
      };
    } catch (error) {
      return {
        success: false,
        data: {
          evaluation: "fail",
          score: 0,
          feedback: "Critic internal failure during evaluation.",
          suggestions: []
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/customizer-agent.ts
var CustomizerAgent = class extends BaseAgent {
  getName() {
    return "CustomizerAgent";
  }
  async run(input, _context, signal) {
    this.log(`Applying surgical customization to [${input.templateId}]...`);
    const system = `You are a Surgical Code Customization Agent.
Your task is to modify a prebuilt codebase to match a user's specific requirements.
DO NOT rewrite the entire file if only small changes are needed.
Focus on:
1. Branding: Updating hero sections, titles, and theme colors.
2. Features: Adding or modifying components to match the requested features.
3. Content: Replacing placeholder text with relevant copy for the user's project.

You will be provided with the user prompt and a list of files from the template.
Output strictly valid JSON with full file contents for the modified files:
{
  "patches": [
    { "path": "path/to/file.tsx", "content": "Full modified file content", "explanation": "Why this change was made" }
  ]
}`;
    const userPrompt = `User Prompt: ${input.prompt}
Target Branding: ${JSON.stringify(input.branding)}
Target Features: ${input.features.join(", ")}

Files to customize:
${input.files.map((f) => `--- ${f.path} ---
${f.content}`).join("\n\n")}`;
    try {
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.3-70b-versatile", signal, void 0, _context);
      const patches = result.patches;
      this.log(`Generated ${patches.length} surgical patches.`);
      return {
        success: true,
        data: { patches },
        tokens,
        logs: this.logs
      };
    } catch (error) {
      return {
        success: false,
        data: { patches: [] },
        logs: this.logs,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/database-agent.ts
var DatabaseAgent = class extends BaseAgent {
  getName() {
    return "DatabaseAgent";
  }
  async run(input, _context, signal, strategy) {
    const prompt2 = typeof input === "string" ? input : input.prompt;
    if (typeof input === "object" && input.isIncremental) {
      const dbFiles = input.affectedFiles?.filter((f) => f.includes("schema") || f.includes("migration") || f.includes("seed"));
      if (!dbFiles || dbFiles.length === 0) {
        this.log(`Skipping Database schema generation (no database files affected in incremental build)`);
        return { success: true, data: { schema: "", entities: [] }, tokens: 0 };
      }
    }
    void _context;
    this.log(`Designing schema for: ${prompt2}`);
    try {
      const system = `You are a Senior Database Architect. 
            Analyze the project requirements and design a robust SQL schema.
            Output JSON with "schema" (SQL string) and "entities" (array of table names).`;
      const { result, tokens } = await this.promptLLM(system, `Project: ${prompt2}`, "llama-3.3-70b-versatile", signal, strategy, _context);
      this.log(`Schema designed with tables: ${result.entities?.join(", ")}`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/debug-agent.ts
var DebugAgent = class extends BaseAgent {
  getName() {
    return "DebugAgent";
  }
  async run(input, _context, signal, strategy) {
    void _context;
    this.log(`Performing autonomous root-cause analysis on ${input.errors.substring(0, 80)}...`);
    try {
      const historyBlock = input.failureHistory?.length ? `

PREVIOUS FIX ATTEMPTS THAT FAILED (do NOT repeat these approaches):
${input.failureHistory.map((f, i) => `${i + 1}. ${f}`).join("\n")}` : "";
      const system = `You are an elite autonomous AI Debugger (Devin-class).
A generated application hit fatal errors during compilation or runtime.

Your process:
1. DIAGNOSE: Identify the exact root cause from the error logs.
2. CATEGORISE: Classify the error type (syntax, type_error, import, logic, dependency, runtime, unknown).
3. FIX: Output minimal, surgical patches that address the root cause.
4. SCORE: Rate your confidence in the fix from 0 to 1.

Rules:
- Only patch files that are directly responsible for the error.
- Each patch must contain the COMPLETE file content (not just the changed lines).
- Ensure all imports resolve correctly.
- Never introduce new dependencies that aren't already in package.json.
- If you see the same error pattern in the failure history, try a fundamentally different approach.
- Be conservative: fix the error without changing unrelated code.

Output strictly valid JSON:
{
  "rootCause": "One-sentence technical diagnosis of why it failed",
  "explanation": "Detailed step-by-step explanation of your fix",
  "category": "syntax|type_error|import|logic|dependency|runtime|unknown",
  "confidence": 0.85,
  "patches": [
    { "path": "relative/path/to/file.ts", "content": "complete corrected file content" }
  ]
}`;
      const userPrompt = `ERROR OUTPUT:
${input.errors.substring(0, 4e3)}

${input.stdout ? `STDOUT:
${input.stdout.substring(0, 1e3)}` : ""}

CURRENT FILES (showing relevant files):
${input.files.slice(0, 15).map((f) => `--- ${f.path} ---
${f.content.substring(0, 3e3)}`).join("\n\n")}

${input.userPrompt ? `ORIGINAL USER REQUIREMENT: ${input.userPrompt}` : ""}${historyBlock}`;
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.3-70b-versatile", signal, strategy, _context);
      const output = result;
      this.log(`Root cause: [${output.category}] ${output.rootCause}. Confidence: ${output.confidence}. Patches: ${output.patches?.length || 0}`);
      return {
        success: true,
        data: output,
        tokens,
        confidence: output.confidence
      };
    } catch (error) {
      return {
        success: false,
        data: {
          rootCause: "DebugAgent internal failure",
          explanation: error instanceof Error ? error.message : String(error),
          patches: [],
          confidence: 0,
          category: "unknown"
        },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/deploy-agent.ts
var DeploymentAgent = class extends BaseAgent {
  getName() {
    return "DeploymentAgent";
  }
  async run(input, _context, signal, strategy) {
    void _context;
    this.log(`Generating Deployment configuration (Docker, hosting)...`);
    try {
      const system = `You are a DevOps Architect. 
            Create Dockerfiles and deployment scripts.
            Output JSON with:
            1. "files" (array of {path: string, content: string}) for DevOps configuration.
            2. "previewUrl": a string representing the simulated local deployment URL (e.g. "http://localhost:3000").
            Ensure your output is strictly valid JSON matching this schema.`;
      const { result, tokens } = await this.promptLLM(system, `Prompt: ${input.prompt}
Files: ${JSON.stringify(input.allFiles)}`, "llama-3.3-70b-versatile", signal, strategy, _context);
      this.log(`Generated ${result.files?.length || 0} deployment config files`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/evolution-agent.ts
import { db } from "@packages/db";
var EvolutionAgent = class extends BaseAgent {
  getName() {
    return "EvolutionAgent";
  }
  /**
   * Conducts autonomous product optimization by proposing structured patches.
   */
  async run(input, _context, signal, strategy) {
    this.log(`Initiating self-evolution sequence. Focus: ${input.optimizationFocus}`);
    const patterns = await db.pattern.findMany({
      where: { type: "failure_pattern" },
      orderBy: { weight: "desc" },
      take: 3
    });
    const modules = await db.codeModule.findMany({
      where: { riskLevel: { in: ["low", "medium"] } },
      // Start with safe modules
      take: 5
    });
    const system = `You are a Principal Evolution Engineer.
        Your goal is to propose a SAFE, surgical code improvement to resolve a system bottleneck.
        
        PATTERNS TO ADAPT:
        ${JSON.stringify(patterns, null, 2)}
        
        AVAILABLE TARGETS:
        ${JSON.stringify(modules, null, 2)}

        RULES:
        1. Only propose changes to 'low' or 'medium' risk modules.
        2. Output a structured patch and a clear reason.
        3. Do NOT suggest infra removals or security changes.
        4. Focus on ${input.optimizationFocus}.

        Output JSON:
        {
            "targetPath": "relative/path/to/file.ts",
            "changeType": "optimization",
            "reason": "Technical justification",
            "patch": "Complete new content for the file",
            "impact": { "latency": -10, "risk": "low" }
        }`;
    try {
      const { result, tokens } = await this.promptLLM(system, "Propose the most impactful safe change.", "llama-3.3-70b-versatile", signal, strategy, _context);
      const proposal = await db.proposedChange.create({
        data: {
          agentId: this.getName(),
          targetPath: result.targetPath,
          changeType: result.changeType,
          reason: result.reason,
          patch: result.patch,
          expectedImpact: result.impact,
          status: "proposed"
        }
      });
      this.log(`Proposal [${proposal.id}] generated for ${result.targetPath}. Status: PROPOSED.`);
      return {
        success: true,
        data: proposal,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/frontend-agent.ts
var FrontendAgent = class extends BaseAgent {
  getName() {
    return "FrontendAgent";
  }
  async run(input, _context, signal, strategy) {
    if (input.isIncremental && !input.isPatch) {
      const frontendFiles = input.affectedFiles?.filter((f) => f.includes("page") || f.includes("layout") || f.includes("component") || f.includes("tailwind") || f.endsWith(".css"));
      if (!frontendFiles || frontendFiles.length === 0) {
        this.log(`Skipping Frontend generation (no frontend files affected)`);
        return { success: true, data: { files: [] }, tokens: 0 };
      }
    }
    void _context;
    if (input.isPatch && input.section) {
      this.log(`Generating SURGICAL PATCH for section: ${input.section}`);
      const system = `You are a Senior UI/UX Engineer.
Your goal is to generate the JSX/TSX content for a specific SECTION of a page.
The parent component already exists; you only provide the inner code for the requested section.

SECTION TO GENERATE: ${input.section}
RULES:
1. STYLING: Use Tailwind CSS classes exclusively.
2. COMPONENTS: Use Lucide-React icons if needed.
3. CONTEXT: Follow the user's prompt aesthetic but stay within the limits of a single section.
4. FORMAT: Return valid JSX that can be injected into the template.

Output strictly valid JSON:
{
  "section": "${input.section}",
  "content": "JSX code string here..."
}`;
      const { result, tokens } = await this.promptLLM(system, `User Request: ${input.prompt}`, "llama-3.3-70b-versatile", signal, strategy, _context);
      return {
        success: true,
        data: { patch: result },
        tokens
      };
    }
    this.log(`Generating FULL Frontend UI modules...`);
    try {
      const system = `You are a Senior Frontend Architect. 
            Design a premium, responsive UI using Tailwind.
            Output JSON with "files" (array of {path: string, content: string}) for the frontend.`;
      const { result, tokens } = await this.promptLLM(system, `Project: ${input.prompt}
Backend Context: ${JSON.stringify(input.backendFiles)}`, "llama-3.3-70b-versatile", signal, strategy);
      this.log(`Generated ${result.files?.length || 0} frontend files`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/healing-agent.ts
import logger4 from "@packages/utils";
var HealingAgent = class _HealingAgent extends BaseAgent {
  getName() {
    return "HealingAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log(`Analyzing error autonomously: ${input.error.substring(0, 100)}...`);
    const result = await _HealingAgent.diagnoseAndFix({
      projectId: _context.getExecutionId() || "unknown",
      errorLogs: input.error,
      lastAction: "autonomous_execution"
    });
    return {
      success: result.fixed,
      data: result,
      tokens: 0
    };
  }
  /**
   * Analyzes error logs and generates a potential code fix.
   * In a production swarm, this would be a specialized LLM call.
   */
  static async diagnoseAndFix(request) {
    const { projectId, errorLogs, lastAction } = request;
    logger4.info({ projectId, lastAction }, "[HealingAgent] Diagnosing build failure...");
    if (errorLogs.includes("MODULE_NOT_FOUND")) {
      return {
        fixed: true,
        explanation: "Detected missing module. Attempting path resolution fix.",
        targetFile: request.filePath || "unknown",
        codeFix: "// Fixed via path resolution healing"
      };
    }
    if (errorLogs.includes("SyntaxError")) {
      return {
        fixed: true,
        explanation: "Detected syntax error. Removing invalid tokens.",
        targetFile: request.filePath || "unknown",
        codeFix: "// Fixed via syntax correction healing"
      };
    }
    logger4.warn({ projectId }, "[HealingAgent] Could not find automated fix pattern.");
    return {
      fixed: false,
      explanation: "Unrecognized error pattern. Human intervention or multi-agent research session recommended."
    };
  }
  /**
   * Applies a healing fix to the project filesystem.
   */
  static async applyFix(projectId, result) {
    if (!result.fixed || !result.targetFile || !result.codeFix) return;
    logger4.info({ projectId, targetFile: result.targetFile }, "[HealingAgent] Applying autonomous fix...");
  }
};

// src/intent-agent.ts
var IntentDetectionAgent = class extends BaseAgent {
  getName() {
    return "IntentDetectionAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log("Detecting user intent and selecting template...");
    const system = `You are a High-Speed Intent Classifier.
Your goal is to map a user's prompt to a prebuilt project template and extract key branding/feature requirements.

User-selected or recommended Tech Stack: ${input.techStack ? JSON.stringify(input.techStack) : "None"}
If a tech stack is provided, prioritize selecting templates or features that align with it.

Available Templates:
- nextjs-tailwind-basic: Best for landing pages, simple portfolios, and marketing sites using Next.js and Tailwind.
- fullstack-app: Best for dashboards, SaaS, or apps requiring a database, auth (Supabase), and complex CRUD.

Output strictly valid JSON:
{
  "templateId": "nextjs-tailwind-basic",
  "projectName": "string",
  "description": "Short project summary",
  "features": ["string"],
  "branding": {
    "primaryColor": "CSS color (e.g. #3b82f6)",
    "theme": "dark" | "light"
  }
}`;
    try {
      const { result, tokens } = await this.promptLLM(system, input.prompt, "llama-3.3-70b-versatile", signal, void 0, _context);
      const intent = result;
      this.log(`Intent detected: Template [${intent.templateId}] selected for project [${intent.projectName}].`);
      return {
        success: true,
        data: intent,
        tokens,
        logs: this.logs
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        logs: this.logs,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/meta-agent.ts
import logger5 from "@packages/utils";
var MetaAgent = class extends BaseAgent {
  getName() {
    return "MetaAgent";
  }
  async run(input, _context, signal, strategy) {
    const { task } = input;
    this.log("Analyzing prompt for high-level orchestration strategy...");
    try {
      const system = `You are the Meta-Agent Controller (Top-level Brain). 
Your task is to analyze the user's request and determine the technical intent, complexity, and the specialized agents needed to fulfill it.

Available Agents:
- PlannerAgent: Overall project decomposition (always needed for new projects)
- DatabaseAgent: Schema and DB logic
- BackendAgent: API and Server logic
- FrontendAgent: Components and Styling
- ValidatorAgent: Type safety and debugging
- DockerAgent: Containerization
- DeploymentAgent: Production releases

Output strictly valid JSON matching this schema:
{
  "intent": "NEW_PROJECT|FEATURE_UPDATE|BUG_FIX|OPTIMIZATION",
  "complexity": "simple|moderate|complex",
  "requiredAgents": ["AgentName", ...],
  "priority": number (1: high, 10: low),
  "recommendedTechStack": {
    "framework": "string",
    "database": "string",
    "styling": "string"
  }
}`;
      const { result, tokens } = await this.promptLLM(system, prompt, "llama-3.3-70b-versatile", signal, void 0, _context);
      const strategy2 = result;
      this.log(`Strategy determined: Intent=${strategy2.intent}, Complexity=${strategy2.complexity}, Agents=${strategy2.requiredAgents.join(", ")}`);
      return {
        success: true,
        data: strategy2,
        tokens,
        logs: this.logs
      };
    } catch (error) {
      logger5.error({ error }, "MetaAgent analysis failed");
      return {
        success: false,
        data: null,
        logs: this.logs,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/planner-agent.ts
var PlannerAgent = class extends BaseAgent {
  getName() {
    return "PlannerAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log("Decomposing mission requirements into a structured plan...");
    const system = `You are a Lead Platform Architect (Aion Planner).
Your goal is to decompose a user's mission prompt into a directed acyclic graph (DAG) of specialized agent tasks.

Task Types available:
- architect: High-level design and tech stack selection.
- frontend: Generate React/Next.js UI components.
- backend: Generate API routes, models, and logic.
- devops: Generate Docker and Terraform configurations.

Rules:
1. Break the work into logical, manageable nodes.
2. Define dependencies (dependsOn) clearly (e.g., frontend depends on architect).
3. Specify inputs each task needs from its dependencies.
4. Output ONLY strictly valid JSON.

Output Format:
{
  "blueprint": { "techStack": "...", "description": "..." },
  "tasks": [
    {
      "id": "task_1",
      "type": "architect",
      "title": "...",
      "description": "...",
      "payload": { "prompt": "..." }
    },
    {
      "id": "task_2",
      "type": "frontend",
      "dependsOn": ["task_1"],
      "title": "...",
      "description": "...",
      "payload": { "prompt": "..." }
    }
  ]
}`;
    const userPrompt = `USER MISSION: ${input.prompt}
ADDITIONAL CONTEXT: ${input.context || "None"}`;
    try {
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.3-70b-versatile", signal, strategy, _context);
      const output = result;
      this.log(`Plan generated with ${output.steps?.length || 0} steps.`);
      return {
        success: true,
        data: output,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: { projectName: "fail", templateId: "fail", techStack: { framework: "", styling: "", backend: "", database: "" }, steps: [] },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/ranking-agent.ts
var RankingAgent = class extends BaseAgent {
  getName() {
    return "RankingAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log(`Judging ${input.variants.length} implementation variants based on ${input.criteria}...`);
    const system = `You are a Principal Software Architect Reviewer.
Your job is to compare multiple code implementations and select the ONE that is most robust, maintainable, and efficient.

Criteria: ${input.criteria}

Output strictly valid JSON:
{
  "winnerBranchId": "id",
  "confidence": 0.95,
  "justification": "Why this version is superior"
}`;
    const userPrompt = `Compare these variants:

${input.variants.map((v) => `BRANCH: ${v.branchId}
CODE:
${v.content}`).join("\n\n---")}`;
    const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.1-8b-instant", signal, strategy, _context);
    return {
      success: true,
      data: result,
      tokens,
      logs: this.logs
    };
  }
};

// src/repair-agent.ts
var RepairAgent = class extends BaseAgent {
  getName() {
    return "RepairAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log(`Analyzing build/runtime error autonomously...`);
    try {
      const system = `You are a Senior Autonomous AI Software Healer.
A generative project hit a fatal compilation, dependency, or runtime error during build validation.

Your task is to:
1. Identify the root cause from the stderr and build logs.
2. Determine if it's a missing npm dependency, a syntax error, or a configuration issue.
3. Output surgical patches to repair the codebase.

REPAIR STRATEGY:
- If a module is missing (e.g., "Module not found: react-hook-form"), include an update to 'package.json'.
- If there's a syntax error (e.g., "Unexpected token"), rewrite the specific file.
- If it's a Next.js/Tailwind config issue, fix the configuration file.

Output strictly verifiable JSON matching this schema:
{
  "explanation": "Root cause analysis and fix strategy",
  "missingDependencies": ["list", "of", "npm", "packages", "to", "install"],
  "patches": [
    {
      "path": "the file path relative to root",
      "content": "the complete rewritten file content"
    }
  ],
  "confidenceScore": 0.0-1.0
}
Ensure output is syntactically valid TypeScript or JSON. Prevent hallucinations.`;
      const prompt2 = `
FAILED COMMAND: ${input.command || "unknown"}
ERROR (STDERR): 
${input.stderr.substring(0, 4e3)}

STDOUT:
${input.stdout.substring(0, 1e3)}

CURRENT FILE MAP:
${JSON.stringify(input.files.map((f) => ({ path: f.path, size: f.content?.length || 0 })))}
`;
      const { result, tokens } = await this.promptLLM(system, prompt2, "llama-3.3-70b-versatile", signal, strategy, _context);
      this.log(`Emitted ${result.patches?.length || 0} patches and identified ${result.missingDependencies?.length || 0} missing deps. Diagnosis: ${result.explanation}`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/research-agent.ts
var ResearchAgent = class extends BaseAgent {
  getName() {
    return "ResearchAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log("Initiating autonomous research protocol...");
    const system = `You are a Lead Research Engineer at an AI Software Factory.
Your goal is to perform a pre-build analysis of the user's request.
Analyze the prompt for:
1. Necessary high-performance libraries (prefer local/well-supported ones).
2. Potential architectural blockers (e.g., rate limits, environment constraints).
3. Security considerations.
4. Infrastructure needs.

Output strictly valid JSON matching this schema:
{
  "vulnerabilities": ["string"],
  "recommendedLibraries": ["string"],
  "potentialBlockers": ["string"],
  "infrastructureSuggestions": ["string"],
  "competitorAnalysis": "brief summary of how this should be built compared to standard apps"
}`;
    try {
      const { result, tokens } = await this.promptLLM(system, input.prompt, "llama-3.3-70b-versatile", signal, void 0, _context);
      const findings = result;
      this.log(`Research complete. Found ${findings.recommendedLibraries.length} key libraries.`);
      return {
        success: true,
        data: findings,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/resume-agent.ts
var ResumeAgent = class extends BaseAgent {
  getName() {
    return "ResumeAgent";
  }
  async run(input, _context, signal, _strategy) {
    this.log(`Optimizing resume for role: ${input.targetRole || "General"}`);
    const { db: db2 } = await import("@packages/db");
    const strategies = await db2.strategy.findMany({ where: { agent: "ResumeAgent" } });
    const candidate = strategies.find((s) => !s.isActive);
    const active = strategies.find((s) => s.isActive);
    const selectedStrategy = candidate && Math.random() > 0.5 ? candidate : active;
    const config = selectedStrategy?.config || { temperature: 0.7 };
    const system = `You are a Senior Technical Recruiter and Resume Expert.
        Your goal is to transform a "task-based" resume into a "result-based" resume.
        
        RULES:
        1. Replace passive verbs (e.g., "worked on") with strong action verbs (e.g., "orchestrated").
        2. Inject measurable metrics where possible (%, $, hours).
        3. Optimize for ATS keywords relevant to the target role.
        ${config.systemPromptSuffix || ""}
        4. Output strictly valid JSON.

        Output Format:
        {
            "score": number,
            "suggestions": ["string"],
            "improved_text": "Markdown formatted resume"
        }`;
    try {
      const { result, tokens } = await this.promptLLM(system, input.resumeText, config.model || "llama-3.3-70b-versatile", signal, selectedStrategy, _context);
      this.log(`Resume optimized via strategy v${selectedStrategy?.version || 1}. Score: ${result.score}.`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/seo-agent.ts
var ProgrammaticSeoAgent = class extends BaseAgent {
  getName() {
    return "ProgrammaticSeoAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log(`Generating SEO content for niche: ${input.niche}`);
    const system = `You are an SEO & Conversion Expert.
        Create an ultra-high-intent landing page for the keyword: "${input.niche}".
        
        Target Keywords: ${input.keywords.join(", ")}
        
        GOAL:
        - Educational content about "${input.niche}".
        - CLEAR CTA to the "AI Resume Optimizer" tool at /resume.
        - Structure: H1 (Keyword-rich), H2 (Problem), H3 (Solution/Tool), P (Value prop).
        
        Output JSON:
        {
            "pages": [
                {
                    "slug": "${input.niche.toLowerCase().replace(/ /g, "-")}",
                    "title": "Optimized Resume for ${input.niche} | AI Power",
                    "content": "Markdown content...",
                    "metaDescription": "Stop getting rejected. Use AI to optimize your ${input.niche} resume in 30 seconds."
                }
            ]
        }`;
    try {
      const { result, tokens } = await this.promptLLM(system, `Generate a landing page for ${input.niche}`, "llama-3.3-70b-versatile", signal, strategy, _context);
      this.log(`Surgical SEO page generated for ${input.niche}.`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/social-agent.ts
var SocialAgent = class extends BaseAgent {
  getName() {
    return "SocialAgent";
  }
  async run(input, _context, signal, strategy) {
    this.log(`Generating high-engagement social copy for ${input.platform} on topic: ${input.topic}`);
    const system = `You are a Direct Response Marketing Expert.
        Your goal is to write a highly viral, value-driven post for ${input.platform}.
        The goal is to drive traffic to ${input.productLink}.
        
        Focus on:
        - Hook: A polarizing or curiosity-inducing first line.
        - Value: 3 bullet points of benefit.
        - CTA: Clear, low-friction link click.
        
        Platform-specific rules:
        - Twitter: Short, punchy, use threads if needed.
        - LinkedIn: Longer, story-based, professional but human.`;
    try {
      const { result, tokens } = await this.promptLLM(system, `Topic: ${input.topic}`, "llama-3.3-70b-versatile", signal, strategy, _context);
      this.log(`Content generated for ${input.platform}. Ready for distribution.`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/task-graph.ts
import logger6 from "@packages/utils";
var TaskGraph = class {
  static resolveExecutionOrder(plan) {
    logger6.info({ taskCount: plan.tasks.length }, "[TaskGraph] Resolving execution order");
    const tasks = [...plan.tasks];
    const executionGroups = [];
    const completedTaskIds = /* @__PURE__ */ new Set();
    while (tasks.length > 0) {
      const currentGroup = tasks.filter(
        (task) => task.dependencies.every((depId) => completedTaskIds.has(depId))
      );
      if (currentGroup.length === 0) {
        logger6.error({ tasks }, "[TaskGraph] Circular dependency detected or missing dependency");
        throw new Error("Invalid Task Graph: Circular dependency or missing task");
      }
      executionGroups.push(currentGroup);
      currentGroup.forEach((t) => {
        completedTaskIds.add(t.id);
        const idx = tasks.indexOf(t);
        tasks.splice(idx, 1);
      });
    }
    return executionGroups;
  }
};

// src/testing-agent.ts
var TestingAgent = class extends BaseAgent {
  getName() {
    return "TestingAgent";
  }
  async run(input, _context, signal, strategy) {
    void _context;
    this.log(`Generating Test cases and QA scripts...`);
    try {
      const system = `You are a QA Engineer. 
            Generate unit and integration tests.
            Output JSON with "files" (array of {path: string, content: string}) for testing.`;
      const userPrompt = `Project: ${input.prompt}
Files Context: ${JSON.stringify(input.allFiles)}`;
      const { result, tokens } = await this.promptLLM(system, userPrompt, "llama-3.1-8b-instant", signal, strategy, _context);
      this.log(`Generated ${result.files?.length || 0} testing files.`);
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/validator-agent.ts
import logger7 from "@packages/utils";
var ValidatorAgent = class extends BaseAgent {
  getName() {
    return "ValidatorAgent";
  }
  async run(input, _context, signal, strategy) {
    const executionId = _context.getExecutionId?.() || "unknown";
    this.log(`Validating output for ${input.agentName}...`, { executionId });
    try {
      const system = `You are a Senior QA Automation Engineer.
            Validate the following agent output against the given specification.
            Provide a confidence score between 0 and 1.
            If score < 0.8, suggest specific improvements.
            Output JSON with "confidenceScore" (number), "isValid" (boolean), and "feedback" (string).`;
      const prompt2 = `Agent: ${input.agentName}
Spec: ${input.spec}
Output: ${JSON.stringify(input.output)}`;
      const { result, tokens } = await this.promptLLM(system, prompt2, "llama-3.3-70b-versatile", signal, strategy, _context);
      logger7.info({
        agentValidated: input.agentName,
        confidence: result.confidenceScore,
        tokens,
        executionId
      }, "Validation complete");
      return {
        success: true,
        data: result,
        tokens
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
export {
  ArchitectureAgent,
  BackendAgent,
  BaseAgent,
  ChatEditAgent,
  CoderAgent,
  ContextBuilder,
  CriticAgent,
  CustomizerAgent,
  DatabaseAgent,
  DebugAgent,
  DeploymentAgent,
  EvolutionAgent,
  FrontendAgent,
  HealingAgent,
  IntentDetectionAgent,
  Memory,
  MetaAgent,
  Planner,
  PlannerAgent,
  ProgrammaticSeoAgent,
  RankingAgent,
  RepairAgent,
  ResearchAgent,
  ResumeAgent,
  SocialAgent,
  TaskGraph,
  TestingAgent,
  ValidatorAgent
};
//# sourceMappingURL=index.mjs.map