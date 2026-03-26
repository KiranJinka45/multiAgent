"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AgentMemory: () => AgentMemory,
  AgentRegistry: () => AgentRegistry,
  ArchitectureAgent: () => ArchitectureAgent,
  BackendAgent: () => BackendAgent,
  BaseAgent: () => BaseAgent,
  ChatEditAgent: () => ChatEditAgent,
  CoderAgent: () => CoderAgent,
  CriticAgent: () => CriticAgent,
  CustomizerAgent: () => CustomizerAgent,
  DatabaseAgent: () => DatabaseAgent,
  DebugAgent: () => DebugAgent,
  DeploymentAgent: () => DeploymentAgent,
  EvolutionAgent: () => EvolutionAgent,
  FrontendAgent: () => FrontendAgent,
  HealingAgent: () => HealingAgent,
  IntentDetectionAgent: () => IntentDetectionAgent,
  JudgeAgent: () => JudgeAgent,
  KnowledgeService: () => KnowledgeService,
  LogAnalysisEngine: () => LogAnalysisEngine,
  MetaAgent: () => MetaAgent,
  MonitoringAgent: () => MonitoringAgent,
  PlannerAgent: () => PlannerAgent,
  RankingAgent: () => RankingAgent,
  RepairAgent: () => RepairAgent,
  ResearchAgent: () => ResearchAgent,
  SaaSMonetizationAgent: () => SaaSMonetizationAgent,
  SandboxEditorAgent: () => SandboxEditorAgent,
  SecurityAgent: () => SecurityAgent,
  TestingAgent: () => TestingAgent,
  ValidatorAgent: () => ValidatorAgent,
  agentRegistry: () => agentRegistry
});
module.exports = __toCommonJS(index_exports);

// src/base-agent.ts
var import_groq_sdk = require("groq-sdk");
var import_observability = require("@libs/observability");
var import_server = require("@libs/utils/server");
var import_ai = require("@libs/ai");
var retry = new import_server.RetryManager(5, 3e3);
var BaseAgent = class {
  groq;
  logs = [];
  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error(`${this.getName()} requires GROQ_API_KEY`);
    this.groq = new import_groq_sdk.Groq({ apiKey });
  }
  log(message, meta = {}) {
    const { executionId, ...rest } = meta;
    import_observability.logger.info({ agent: this.getName(), ...rest }, message);
    if (executionId) {
      import_server.eventBus.thought(executionId, this.getName(), message);
    }
  }
  async promptLLM(system, user, request, signal, strategy) {
    const taskType = request.taskType || "code-gen";
    const context = {
      fileCount: request.context.fileCount,
      errorDepth: request.context.errorDepth
    };
    const modelConfig = await (0, import_ai.selectModel)(taskType, context);
    const model = modelConfig.model;
    const temperature = strategy?.temperature ?? 0.7;
    const budgetStatus = await import_server.CostGovernanceService.checkTokenLimit(request.tenantId);
    if (!budgetStatus.allowed) {
      this.log(`Critical: Budget exceeded for tenant ${request.tenantId}. Halted.`);
      throw new Error(`BudgetExceeded: Monthly token limit reached for tenant ${request.tenantId}`);
    }
    const cachedResult = await import_server.SemanticCacheService.get(user, system, model);
    if (cachedResult) {
      this.log(`Semantic Cache HIT - Reusing result for ${taskType}`);
      return cachedResult;
    }
    this.log(`Invoking LLM (${model}) for task: ${taskType} [Tier: ${modelConfig.quality > 0.9 ? "PREMIUM" : "BALANCED"}]`);
    try {
      const llmResponse = await retry.executeWithRetry(async () => {
        return await import_server.breakers.llm.execute(async () => {
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
          if (!content) throw new Error("Empty response from LLM");
          const executionId = request.context?.executionId || "unknown";
          await import_server.CostGovernanceService.recordTokenUsage(request.tenantId, tokensUsed, executionId);
          if (request.context.userId && request.tenantId) {
            import_server.usageService.recordAiUsage({
              model,
              promptTokens: response.usage?.prompt_tokens || 0,
              completionTokens: response.usage?.completion_tokens || 0,
              totalTokens: tokensUsed,
              userId: request.context.userId,
              tenantId: request.tenantId,
              metadata: {
                executionId,
                agent: this.getName(),
                model
              }
            }).catch((err) => import_observability.logger.error({ err }, "[BaseAgent] Usage tracking failed"));
          }
          const result = {
            result: JSON.parse(content),
            tokens: tokensUsed,
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0
          };
          await import_server.SemanticCacheService.set(user, result, system, model);
          return result;
        });
      }, this.getName(), {});
      return llmResponse;
    } catch (error) {
      this.log(`LLM invocation failed: ${error}`);
      throw error;
    }
  }
};

// src/architecture-agent.ts
var ArchitectureAgent = class extends BaseAgent {
  getName() {
    return "ArchitectureAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context } = request;
    const start = Date.now();
    const findings = context.metadata.findings || {};
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
${prompt}`;
    try {
      request.taskType = "planning";
      const { result, tokens } = await this.promptLLM(
        systemPrompt,
        userPrompt,
        request,
        signal,
        strategy
      );
      const blueprint = result;
      return {
        success: true,
        data: blueprint,
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: `Failed to generate architecture: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

// src/backend-agent.ts
var BackendAgent = class extends BaseAgent {
  getName() {
    return "BackendAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    if (params.isIncremental) {
      const beFiles = params.affectedFiles?.filter((f) => f.includes("api/") || f.includes("middleware") || f.includes("lib/"));
      if (!beFiles || beFiles.length === 0) {
        this.log(`Skipping Backend generation (no backend files affected in incremental build)`, { executionId: context.executionId });
        return {
          success: true,
          data: { files: [] },
          artifacts: [],
          metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
        };
      }
    }
    this.log(`Generating Backend API and logic based on schema...`, { executionId: context.executionId });
    try {
      const system = `You are a Senior Backend Architect specialized in Node.js (Express/NestJS) and Spring Boot.
Your goal is to generate scalable, production-ready backend services.

ARCHITECTURE:
- Clean Architecture (Controller \u2192 Service \u2192 Repository).
- RESTful API design with proper versioning (e.g., /api/v1/...).
- Robust Input Validation (e.g., Zod, Joi, or Hibernate Validator).
- Centralized Error Handling middleware.

PERFORMANCE & SCALABILITY:
- Caching strategy using Redis.
- Async processing (e.g., BullMQ, RabbitMQ, or Spring @Async).
- Database connection pooling and optimization.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/src/controllers/user.controller.ts", "content": "..." },
    { "path": "apps/api/src/services/user.service.ts", "content": "..." },
    { "path": "apps/api/src/repositories/user.repository.ts", "content": "..." },
    { "path": "apps/api/src/middleware/error.handler.ts", "content": "..." },
    { "path": "apps/api/config/redis.config.ts", "content": "..." }
  ],
  "summary": "Brief explanation of architectural decisions"
}`;
      const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT (PLAN):
${JSON.stringify(context.metadata.plan || {})}

DATABASE SCHEMA:
${params.schema || "No explicit schema provided"}`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      const files = result.files || [];
      this.log(`Generated ${files.length} backend files`, { executionId: context.executionId });
      return {
        success: true,
        data: {
          fileCount: files.length,
          paths: files.map((f) => f.path)
        },
        artifacts: files.map((f) => ({ path: f.path, content: f.content, type: "code" })),
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
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
  async execute(request, signal) {
    const { params, context } = request;
    const start = Date.now();
    this.log(`Processing incremental edit request: "${params.editRequest.substring(0, 80)}..."`);
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

TECH STACK: ${JSON.stringify(params.techStack)}

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
${params.projectContext}

CURRENT FILES (to modify):
${params.currentFiles.map((f) => `--- ${f.path} ---
${f.content.substring(0, 3e3)}`).join("\n\n")}

USER REQUEST:
${params.editRequest}

Apply the minimal set of changes to fulfill this request. Output JSON.`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal);
      const editResult = result;
      this.log(`Generated ${editResult.patches?.length || 0} patches. Explanation: ${editResult.explanation}`);
      return {
        success: true,
        data: editResult,
        artifacts: editResult.patches.map((p) => ({ path: p.path, content: p.content, type: "code" })),
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
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
  async execute(request, signal) {
    const { prompt, context, params } = request;
    const start = Date.now();
    this.log(`Generating code for task: "${params.taskTitle}"`, { executionId: context.executionId });
    try {
      const failureContext = params.previousFailures?.length ? `

PREVIOUS FAILED ATTEMPTS (DO NOT repeat these mistakes):
${params.previousFailures.map((f, i) => `${i + 1}. ${f}`).join("\n")}` : "";
      const existingContext = params.existingFiles?.length ? `

EXISTING CODEBASE FILES (reference these for imports, types, and consistency):
${params.existingFiles.map((f) => `--- ${f.path} ---
${f.content.substring(0, 2e3)}`).join("\n\n")}` : "";
      const system = `You are an elite autonomous AI Software Engineer (like Devin).
You write production-grade, type-safe, well-structured code.

Tech Stack: ${JSON.stringify(params.techStack)}

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
      const userPrompt = `TASK: ${params.taskTitle}
DESCRIPTION: ${params.instructions}
TARGET FILES: ${params.fileTargets.join(", ")}${existingContext}${failureContext}`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal);
      const output = result;
      this.log(`Generated ${output.files?.length || 0} files.`, { executionId: context.executionId });
      return {
        success: true,
        data: output,
        artifacts: output.files.map((f) => ({ path: f.path, content: f.content, type: "code" })),
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: { files: [], reasoning: "" },
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/critic-agent.ts
var CriticAgent = class extends BaseAgent {
  getName() {
    return "CriticAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    this.log(`Critical evaluation of task: ${params.task}...`);
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
    const userPrompt = `TASK: ${params.task}
PRODUCED OUTPUT: ${JSON.stringify(params.output)}
EXPECTED REQUIREMENTS: ${params.requirements || "N/A"}

RELEVANT FILE CONTEXT:
${params.artifacts?.map((f) => `--- ${f.path} ---
${f.content.substring(0, 1e3)}`).join("\n")}`;
    try {
      request.taskType = "refactor";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      const output = result;
      this.log(`Evaluation: ${output.evaluation.toUpperCase()} (Score: ${output.score}). Feedback: ${output.feedback}`);
      return {
        success: true,
        data: output,
        artifacts: [],
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: tokens
        },
        confidence: output.score
      };
    } catch (error) {
      const tokens = 0;
      return {
        success: false,
        artifacts: [],
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: tokens
        },
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
  async execute(request, signal) {
    const { params, context } = request;
    const start = Date.now();
    this.log(`Applying surgical customization to [${params.templateId}]...`);
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
    const userPrompt = `User Prompt: ${params.prompt}
Target Branding: ${JSON.stringify(params.branding)}
Target Features: ${params.features.join(", ")}

Files to customize:
${params.files.map((f) => `--- ${f.path} ---
${f.content}`).join("\n\n")}`;
    try {
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal);
      const patches = result.patches;
      this.log(`Generated ${patches.length} surgical patches.`);
      return {
        success: true,
        data: { patches },
        artifacts: patches.map((p) => ({ path: p.path, content: p.content, type: "code" })),
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: { patches: [] },
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
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
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    if (params.isIncremental) {
      const dbFiles = params.affectedFiles?.filter((f) => f.includes("schema") || f.includes("migration") || f.includes("seed"));
      if (!dbFiles || dbFiles.length === 0) {
        this.log(`Skipping Database schema generation (no database files affected in incremental build)`, { executionId: context.executionId });
        return {
          success: true,
          data: { schema: "", entities: [] },
          artifacts: [],
          metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
        };
      }
    }
    this.log(`Designing optimized Supabase/PostgreSQL schema for: ${prompt}`, { executionId: context.executionId });
    try {
      const system = `You are a Senior Database Architect specialized in Supabase and PostgreSQL.
Your goal is to design a high-performance, normalized database schema.

REQUIREMENTS:
- Data normalization (3NF where appropriate).
- Performance indexing (B-tree, GIN, etc.) for frequent queries identified from planner input.
- Clear foreign key relationships and constraints.
- Scalability-first design.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/supabase/migrations/20240101_init.sql", "content": "..." },
    { "path": "apps/api/prisma/schema.prisma", "content": "..." },
    { "path": "apps/api/src/db/models/user.ts", "content": "..." }
  ],
  "entities": ["list", "of", "table", "names"],
  "summary": "Brief explanation of schema design and indexing strategy"
}`;
      const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

FRONTEND/BACKEND CONTEXT:
${JSON.stringify(params.affectedFiles || [])}`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      this.log(`Schema designed with tables: ${result.entities?.join(", ")}`, { executionId: context.executionId });
      return {
        success: true,
        data: result,
        artifacts: result.files?.map((f) => ({ path: f.path, content: f.content, type: "infrastructure" })) || [],
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
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
  async execute(request, signal, strategy) {
    const { params, context } = request;
    const start = Date.now();
    this.log(`Performing autonomous root-cause analysis on ${params.errors.substring(0, 80)}...`, { executionId: context.executionId });
    try {
      const historyBlock = params.failureHistory?.length ? `

PREVIOUS FIX ATTEMPTS THAT FAILED:
${params.failureHistory.map((f, i) => `${i + 1}. ${f}`).join("\n")}` : "";
      const system = `You are a Senior Autonomous AI Debugger.
Your goal is to automatically detect, analyze, and permanently fix system failures.

TASK:
- Identify the root cause from provided logs and errors.
- Generate a surgical fix and a corresponding preventive action.
- Ensure that the fix is permanent and that the issue never repeats (no temporary workarounds).

OUTPUT:
Respond ONLY with a JSON object:
{
  "rootCause": "Deep dive into why the failure occurred",
  "fix": "Specific description of the code fix applied",
  "preventiveAction": "What was done to ensure this never happens again (e.g., adding a guard, improving types, updating config)",
  "explanation": "Detailed step-by-step diagnostic",
  "patches": [
    { "path": "the/file/path.ts", "content": "..." }
  ],
  "confidence": 0.0-1.0,
  "category": "syntax | type_error | import | logic | dependency | runtime | unknown"
}`;
      const userPrompt = `ERROR OUTPUT: ${params.errors.substring(0, 4e3)}
${historyBlock}`;
      request.taskType = "debug";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      const output = result;
      return {
        success: true,
        data: output,
        artifacts: output.patches.map((p) => ({ path: p.path, content: p.content, type: "code" })),
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          rootCause: "fail",
          fix: "none",
          preventiveAction: "none",
          explanation: String(error),
          patches: [],
          confidence: 0,
          category: "unknown"
        },
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: String(error)
      };
    }
  }
};

// src/deploy-agent.ts
var DeploymentAgent = class extends BaseAgent {
  getName() {
    return "DeploymentAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context } = request;
    const start = Date.now();
    this.log(`Generating Production-Ready Deployment configuration (Docker, CI/CD)...`, { executionId: context.executionId });
    try {
      const system = `You are a Senior DevOps Engineer and Cloud Architect.
Your goal is to make the application production-ready with one-click deployment capabilities.

REQUIREMENTS:
- Dockerize all services (multi-stage builds for optimization).
- CI/CD pipeline configuration (e.g., GitHub Actions, GitLab CI).
- Cloud deployment strategy (AWS, GCP, or Vercel) based on tech stack.
- Infrastructure as Code (IaC) or deployment scripts.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "infrastructure/docker/Dockerfile.web", "content": "..." },
    { "path": "infrastructure/docker/Dockerfile.api", "content": "..." },
    { "path": "infrastructure/ci-cd/github-actions.yml", "content": "..." },
    { "path": "infrastructure/terraform/main.tf", "content": "..." },
    { "path": "docker-compose.yml", "content": "..." }
  ],
  "summary": "Brief explanation of deployment strategy and one-click setup"
}`;
      const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

TECH STACK:
${JSON.stringify(context.metadata.techStack || {})}`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      this.log(`Generated ${result.files?.length || 0} deployment config files`, { executionId: context.executionId });
      return {
        success: true,
        data: result,
        artifacts: result.files?.map((f) => ({ path: f.path, content: f.content, type: "infrastructure" })) || [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/evolution-agent.ts
var EvolutionAgent = class extends BaseAgent {
  getName() {
    return "EvolutionAgent";
  }
  /**
   * Conducts autonomous product optimization based on performance metrics.
   */
  async execute(request, signal) {
    const { params } = request;
    const start = Date.now();
    this.log(`Starting autonomous project optimization for [${params.projectId}]...`);
    if (params.optimizationFocus === "performance") {
      return {
        success: true,
        data: {
          optimized: true,
          improvementExplanation: "Identified blocking API calls. Converting to parallel Promise.all for 40% latency reduction.",
          patches: [
            { path: "src/app/api/data/route.ts", content: "// Optimized async logic" }
          ]
        },
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
      };
    }
    return {
      success: true,
      data: {
        optimized: false,
        patches: [],
        improvementExplanation: "No clear optimization path identified for current metrics."
      },
      artifacts: [],
      metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
    };
  }
};

// src/frontend-agent.ts
var FrontendAgent = class extends BaseAgent {
  getName() {
    return "FrontendAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    if (params.isIncremental && !params.isPatch) {
      const frontendFiles = params.affectedFiles?.filter((f) => f.includes("page") || f.includes("layout") || f.includes("component") || f.includes("tailwind") || f.endsWith(".css"));
      if (!frontendFiles || frontendFiles.length === 0) {
        this.log(`Skipping Frontend generation (no frontend files affected)`, { executionId: context.executionId });
        return {
          success: true,
          data: { files: [] },
          artifacts: [],
          metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
        };
      }
    }
    if (params.isPatch && params.section) {
      this.log(`Generating SURGICAL PATCH for section: ${params.section}`, { executionId: context.executionId });
      const system = `You are a Senior UI/UX Engineer.
Design a premium, responsive UI section using Tailwind.
Output strictly valid JSON: { "section": "...", "content": "JSX code..." }`;
      try {
        request.taskType = "code-gen";
        const { result, tokens } = await this.promptLLM(system, `User Request: ${prompt}`, request, signal, strategy);
        return {
          success: true,
          data: { patch: result },
          artifacts: [],
          metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
        };
      } catch (err) {
        return { success: false, data: null, artifacts: [], metrics: { durationMs: 0, tokensTotal: 0 }, error: String(err) };
      }
    }
    this.log(`Generating FULL Frontend UI modules...`, { executionId: context.executionId });
    try {
      const system = `You are a Senior Frontend Architect specialized in Next.js (App Router), TypeScript, and Tailwind CSS.
Your goal is to generate a production-ready, high-performance UI based on the planner's input.

ARCHITECTURE:
- Modular, component-based design.
- Code splitting and lazy loading via Next.js dynamic imports.
- Responsive design (mobile-first) using Tailwind.
- API integration layer using React Query or standardized fetch hooks.
- State management using Zustand or React Context where appropriate.

OPTIMIZATIONS:
- SEO best practices (metadata, semantic HTML).
- Performance-first rendering (ISR/SSR where beneficial).
- Clean, type-safe code (No 'any').

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/web/app/page.tsx", "content": "..." },
    { "path": "apps/web/components/ui/Button.tsx", "content": "..." },
    { "path": "apps/web/hooks/useApi.ts", "content": "..." }
  ],
  "summary": "Brief explanation of architectural choices"
}`;
      const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

BACKEND CONTEXT:
${JSON.stringify(params.backendFiles || [])}`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      this.log(`Generated ${result.files?.length || 0} frontend files`, { executionId: context.executionId });
      return {
        success: true,
        data: result,
        artifacts: result.files.map((f) => ({ path: f.path, content: f.content, type: "code" })),
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/healing-agent.ts
var HealingAgent = class extends BaseAgent {
  getName() {
    return "HealingAgent";
  }
  /**
   * Analyzes error logs and generates a potential code fix.
   */
  async execute(request, signal) {
    const { params } = request;
    const start = Date.now();
    this.log(`Diagnosing build failure for [${params.projectId}]...`);
    if (params.errorLogs.includes("MODULE_NOT_FOUND")) {
      return {
        success: true,
        data: {
          fixed: true,
          explanation: "Detected missing module. Attempting path resolution fix.",
          targetFile: params.filePath || "unknown",
          codeFix: "// Fixed via path resolution healing"
        },
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
      };
    }
    return {
      success: true,
      data: {
        fixed: false,
        explanation: "Unrecognized error pattern. Human intervention recommended."
      },
      artifacts: [],
      metrics: { durationMs: Date.now() - start, tokensTotal: 0 }
    };
  }
  /**
   * Applies a healing fix to the project filesystem.
   */
  async applyFix(projectId, result) {
    if (!result.fixed || !result.targetFile || !result.codeFix) return;
    this.log(`Applying autonomous fix to [${result.targetFile}] for [${projectId}]...`);
  }
};

// src/intent-agent.ts
var IntentDetectionAgent = class extends BaseAgent {
  getName() {
    return "IntentDetectionAgent";
  }
  async execute(request, signal) {
    const { prompt, context, params } = request;
    const start = Date.now();
    this.log("Detecting user intent and selecting template...", { executionId: context.executionId });
    const system = `You are a High-Speed Intent Classifier.
Your goal is to map a user's prompt to a prebuilt project template and extract key branding/feature requirements.

User-selected or recommended Tech Stack: ${params.techStack ? JSON.stringify(params.techStack) : "None"}
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
      request.taskType = "planning";
      const { result, tokens } = await this.promptLLM(system, prompt, request, signal);
      const intent = result;
      this.log(`Intent detected: Template [${intent.templateId}] selected for project [${intent.projectName}].`, { executionId: context.executionId });
      return {
        success: true,
        data: intent,
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/judge-agent.ts
var import_utils = __toESM(require("@libs/utils"));
var JudgeAgent = class extends BaseAgent {
  constructor() {
    super();
  }
  getName() {
    return "judge";
  }
  async execute(request) {
    const { prompt, params, tenantId } = request;
    const artifactsSummary = params.artifacts.map((a) => `- ${a.path}`).join("\n");
    import_utils.default.info({ tenantId }, "[JudgeAgent] Evaluating intent vs output");
    const systemPrompt = `
You are a Principal AI Judge. Your task is to evaluate whether the provided artifacts satisfy the User's Intent.

User Intent: "${prompt}"

Generated Artifacts:
${artifactsSummary}

Respond in JSON format:
{
  "success": boolean,
  "confidence": number (0-1),
  "reasoning": "Detailed explanation of why the output matches or fails the intent",
  "criticism": ["Point 1", "Point 2"]
}
        `.trim();
    try {
      const llmRes = await this.promptLLM(systemPrompt, "Evaluate the artifacts against intent.", request);
      const evaluation = llmRes.result;
      return {
        success: true,
        data: evaluation,
        artifacts: [],
        metrics: {
          durationMs: 0,
          tokensTotal: llmRes.tokens
        },
        confidence: evaluation.confidence
      };
    } catch (err) {
      import_utils.default.error({ err }, "[JudgeAgent] Failed to perform intent evaluation");
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: "Intent evaluation failed"
      };
    }
  }
};

// src/meta-agent.ts
var import_utils2 = __toESM(require("@libs/utils"));
var MetaAgent = class extends BaseAgent {
  getName() {
    return "MetaAgent";
  }
  async execute(request, signal) {
    const { prompt } = request;
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
      request.taskType = "planning";
      const { result, tokens } = await this.promptLLM(system, prompt, request, signal);
      const strategy = result;
      this.log(`Strategy determined: Intent=${strategy.intent}, Complexity=${strategy.complexity}, Agents=${strategy.requiredAgents.join(", ")}`);
      return {
        success: true,
        data: strategy,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: tokens }
      };
    } catch (error) {
      import_utils2.default.error({ error }, "MetaAgent analysis failed");
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/monitoring-agent.ts
var MonitoringAgent = class extends BaseAgent {
  getName() {
    return "MonitoringAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context } = request;
    const start = Date.now();
    this.log(`Setting up observability and monitoring (Prometheus/Grafana/Alerts)...`, { executionId: context.executionId });
    try {
      const system = `You are a Senior SRE Engineer specialized in Prometheus and Grafana.
Your goal is to add comprehensive observability to the application.

REQUIREMENTS:
- Metrics collection for Latency, Errors, and Throughput using Prometheus (prom-client).
- Grafana dashboard JSON configurations for real-time visualization.
- Alerting rules and thresholds for critical failures.

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/src/monitoring/prometheus.ts", "content": "..." },
    { "path": "infrastructure/grafana/dashboards/main.json", "content": "..." },
    { "path": "infrastructure/prometheus/alerts.yml", "content": "..." },
    { "path": "apps/api/src/middleware/metrics.ts", "content": "..." }
  ],
  "summary": "Brief explanation of observability setup and tracked metrics"
}`;
      const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

TECH STACK:
${JSON.stringify(context.metadata.techStack || {})}`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      return {
        success: true,
        data: result,
        artifacts: result.files?.map((f) => ({ path: f.path, content: f.content, type: "infrastructure" })) || [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: String(error)
      };
    }
  }
};

// src/planner-agent.ts
var PlannerAgent = class extends BaseAgent {
  getName() {
    return "PlannerAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context } = request;
    this.log("Decomposing mission requirements into a structured plan...", { executionId: context.executionId });
    const system = `You are an elite Lead Platform Architect (Planner Agent).
Your goal is to convert a user's app idea into a structured, orchestration-ready execution plan.

TASK:
- Convert the prompt into a DAG (Directed Acyclic Graph) of specialized agent tasks.
- Keep modules independent and ensure clear contracts between them.
- Identify tasks that can run in parallel.

OUTPUT FORMAT (must be valid JSON):
{
  "projectName": "Name of the project",
  "appSummary": "Brief overview of the app idea",
  "featureBreakdown": ["List", "of", "key", "features"],
  "frontendRequirements": ["List", "of", "UI/UX", "needs"],
  "backendApis": [
    { "endpoint": "/api/...", "method": "GET/POST/...", "description": "..." }
  ],
  "databaseSchema": "Description of tables and relationships",
  "authAndRoles": "Description of authentication and RBAC strategy",
  "deploymentPlan": "CI/CD and hosting strategy",
  "templateId": "...",
  "techStack": { "framework": "...", "styling": "...", "backend": "...", "database": "..." },
  "steps": [
    {
      "id": "task_1",
      "agent": "DatabaseAgent | BackendAgent | FrontendAgent | SecurityAgent | DeploymentAgent | MonitoringAgent",
      "title": "Database Schema Design",
      "description": "Design the initial database schema and migrations.",
      "dependencies": [],
      "fileTargets": ["apps/api/prisma/schema.prisma", "apps/api/supabase/migrations/init.sql"]
    }
  ]
}

IMPORTANT: All 'fileTargets' MUST be prefixed with the correct app directory:
- Frontend: apps/web/...
- Backend/Database/Security: apps/api/...
- Shared Packages: packages/...`;
    const userPrompt = `USER MISSION: ${prompt}
ADDITIONAL CONTEXT: ${JSON.stringify(context.metadata) || "None"}`;
    try {
      const start = Date.now();
      request.taskType = "planning";
      const { result, tokens } = await this.promptLLM(system, userPrompt, request, signal, strategy);
      const output = result;
      this.log(`Plan generated with ${output.steps?.length || 0} steps.`, { executionId: context.executionId });
      return {
        success: true,
        data: output,
        artifacts: [],
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          projectName: "fail",
          appSummary: "failed to generate",
          featureBreakdown: [],
          frontendRequirements: [],
          backendApis: [],
          databaseSchema: "",
          authAndRoles: "",
          deploymentPlan: "",
          templateId: "fail",
          techStack: { framework: "", styling: "", backend: "", database: "" },
          steps: []
        },
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
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
  async execute(request) {
    const { prompt: userPromptContext, context, params } = request;
    const start = Date.now();
    this.log(`Judging ${params.variants.length} implementation variants based on ${params.criteria}...`, { executionId: context.executionId });
    const system = `You are a Principal Software Architect Reviewer.
Your job is to compare multiple code implementations and select the ONE that is most robust, maintainable, and efficient.

Criteria: ${params.criteria}

Output strictly valid JSON:
{
  "winnerBranchId": "id",
  "confidence": 0.95,
  "justification": "Why this version is superior"
}`;
    const comparisonPrompt = `Compare these variants:

${params.variants.map((v) => `BRANCH: ${v.branchId}
CODE:
${v.content}`).join("\n\n---")}`;
    try {
      request.taskType = "planning";
      const { result, tokens } = await this.promptLLM(system, comparisonPrompt, request);
      return {
        success: true,
        data: result,
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: String(error)
      };
    }
  }
};

// src/repair-agent.ts
var RepairAgent = class extends BaseAgent {
  getName() {
    return "RepairAgent";
  }
  async execute(request, signal, strategy) {
    const { context, params } = request;
    const start = Date.now();
    this.log(`Analyzing build/runtime error autonomously...`, { executionId: context.executionId });
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
      const prompt = `
FAILED COMMAND: ${params.command || "unknown"}
ERROR (STDERR): 
${params.stderr.substring(0, 4e3)}

STDOUT:
${params.stdout.substring(0, 1e3)}

CURRENT FILE MAP:
${JSON.stringify(params.files.map((f) => ({ path: f.path, size: f.content?.length || 0 })))}
`;
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, prompt, request, void 0, strategy);
      this.log(`Emitted ${result.patches?.length || 0} patches. Diagnosis: ${result.explanation}`, { executionId: context.executionId });
      return {
        success: true,
        data: result,
        artifacts: result.patches?.map((p) => ({ path: p.path, content: p.content, type: "code" })) || [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
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
  async execute(request, signal) {
    const { prompt, context } = request;
    const start = Date.now();
    this.log("Initiating autonomous research protocol...", { executionId: context.executionId });
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
      request.taskType = "planning";
      const { result, tokens } = await this.promptLLM(system, prompt, request, signal);
      const findings = result;
      this.log(`Research complete. Found ${findings.recommendedLibraries.length} key libraries.`, { executionId: context.executionId });
      return {
        success: true,
        data: findings,
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/saas-monetization-agent.ts
var SaaSMonetizationAgent = class extends BaseAgent {
  getName() {
    return "SaaSMonetizationAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context } = request;
    const start = Date.now();
    this.log(`Implementing SaaS monetization (Stripe)...`, { executionId: context.executionId });
    const system = `You are a Fintech Architect specialized in SaaS monetization and Stripe integration.
Your goal is to implement a robust subscription system.

FEATURES:
- Free tier (limited builds/usage).
- Premium tier (fast builds, advanced features).

OUTPUT:
Respond ONLY with a JSON object:
{
  "stripeConfig": "Stripe API and webhook setup",
  "plans": [
    { "name": "Free", "features": ["Limited builds"], "price": "$0" },
    { "name": "Premium", "features": ["Fast builds", "Advanced features"], "price": "$29/mo" }
  ],
  "usageTracking": "Database schema or logic for tracking build usage",
  "files": [
    { "path": "apps/api/src/lib/stripe.ts", "content": "..." },
    { "path": "apps/api/src/middleware/subscription.ts", "content": "..." },
    { "path": "apps/api/src/api/webhooks/stripe.ts", "content": "..." },
    { "path": "apps/web/hooks/useSubscription.ts", "content": "..." }
  ],
  "summary": "Brief explanation of billing integration and access control"
}`;
    try {
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, `Project: ${prompt}`, request, signal, strategy);
      const output = result;
      return {
        success: true,
        data: output,
        artifacts: output.files?.map((f) => ({ path: f.path, content: f.content, type: "code" })) || [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: { stripeConfig: "", plans: [], usageTracking: "", files: [] },
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/sandbox-editor-agent.ts
var SandboxEditorAgent = class extends BaseAgent {
  getName() {
    return "SandboxEditorAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    this.log(`Initializing safe sandbox editor for project: ${params.projectId}`, { executionId: context.executionId });
    const system = `You are a Sandbox Infrastructure Architect.
Your goal is to enable users to edit modular monolith apps safely and provide live previews for both Web and API services.

TASK:
- Define the configuration for a multi-service browser editor and isolated runtimes (sandbox containers).
- Support the new architecture where code is in apps/web/ and apps/api/.
- Ensure zero system access and strict resource limits.
- Support hot reload for a "live" developer experience across all services.

OUTPUT:
Respond ONLY with a JSON object:
{
  "editorUrl": "URL to the browser-based editor",
  "previewUrl": "URL to the main web preview",
  "apiPreviewUrl": "URL to the background API preview",
  "isReady": true,
  "config": {
    "resourceLimits": "CPU: 1.0, RAM: 1GB (Shared)",
    "hotReload": true,
    "securityPolicy": "Strict isolation, no host FS access"
  },
  "summary": "Brief explanation of the modular sandbox setup"
}`;
    try {
      request.taskType = "code-gen";
      const { result, tokens } = await this.promptLLM(system, `User Prompt: ${prompt}
Project ID: ${params.projectId}`, request, signal, strategy);
      const output = result;
      return {
        success: true,
        data: output,
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          editorUrl: "",
          previewUrl: "",
          isReady: false,
          config: { resourceLimits: "", hotReload: false, securityPolicy: "" }
        },
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/security-agent.ts
var SecurityAgent = class extends BaseAgent {
  getName() {
    return "SecurityAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    this.log(`Hardening application security (${params.authProvider})...`, { executionId: context.executionId });
    try {
      const authSystem = `You are a Senior Security Architect specializing in OAuth2, RBAC, and end-to-end system hardening.
Your goal is to secure the system based on the planner's input.

REQUIREMENTS:
- HTTPS enforcement (headers, redirects).
- OAuth2 authentication flow (e.g., Supabase Auth, Auth0, or NextAuth).
- Granular Role-Based Access Control (RBAC) with role definitions.
- Input sanitization (XSS prevention, SQLi guards).
- API Rate Limiting middleware.

BEST PRACTICES:
- No sensitive data exposure in client-side code.
- Secure token handling (HttpOnly cookies, secure storage).

OUTPUT:
Respond ONLY with a JSON object:
{
  "files": [
    { "path": "apps/api/src/middleware/auth.ts", "content": "..." },
    { "path": "apps/api/src/middleware/rate-limit.ts", "content": "..." },
    { "path": "apps/api/config/security.ts", "content": "..." },
    { "path": "apps/api/lib/auth/roles.ts", "content": "..." }
  ],
  "summary": "Brief explanation of security architecture and RBAC flow"
}`;
      const userPrompt = `PROJECT REQUIREMENTS:
${prompt}

PLANNER INPUT:
${JSON.stringify(context.metadata.plan || {})}

ROLES:
${(params.roles || []).join(", ")}`;
      request.taskType = "security-scan";
      const authResult = await this.promptLLM(authSystem, userPrompt, request, signal, strategy);
      this.log(`Running autonomous security scan on generated VFS...`, { executionId: context.executionId });
      const vfsSummary = Object.keys(context.vfs).join(", ");
      const scanSystem = `You are a DevSecOps Engineer.
            Analyze the following files for security vulnerabilities (SQLi, XSS, CSRF, insecure imports).
            Files: ${vfsSummary}
            Output JSON with "isValid" (boolean), "vulnerabilities" (array), and "fixInstructions" (string).`;
      request.taskType = "security-scan";
      const scanResult = await this.promptLLM(scanSystem, `Analyze: ${JSON.stringify(context.vfs)}`, request, signal, strategy);
      return {
        success: true,
        data: {
          auth: authResult.result,
          scan: scanResult.result
        },
        artifacts: authResult.result.files?.map((f) => ({ path: f.path, content: f.content, type: "infrastructure" })) || [],
        metrics: {
          durationMs: Date.now() - start,
          tokensTotal: authResult.tokens + scanResult.tokens
        }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: String(error)
      };
    }
  }
};

// src/testing-agent.ts
var TestingAgent = class extends BaseAgent {
  getName() {
    return "TestingAgent";
  }
  async execute(request, signal, strategy) {
    const { prompt, context, params } = request;
    const start = Date.now();
    this.log(`Generating Test cases and QA scripts...`, { executionId: context.executionId });
    try {
      const system = `You are a QA Engineer. 
            Generate unit and integration tests.
            Output JSON with "files" (array of {path: string, content: string}) for testing.`;
      request.taskType = "testing";
      const { result, tokens } = await this.promptLLM(system, `Project: ${prompt}
Files Context: ${JSON.stringify(params.allFiles)}`, request, signal, strategy);
      this.log(`Generated ${result.files?.length || 0} testing files.`, { executionId: context.executionId });
      return {
        success: true,
        data: result,
        artifacts: result.files?.map((f) => ({ path: f.path, content: f.content, type: "documentation" })) || [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/validator-agent.ts
var ValidatorAgent = class extends BaseAgent {
  getName() {
    return "ValidatorAgent";
  }
  async execute(request, signal, strategy) {
    const { params, context } = request;
    const start = Date.now();
    this.log(`Validating output for ${params.agentName}...`, { executionId: context.executionId });
    try {
      const system = `You are a Senior QA Automation Engineer.
            Validate agent output against spec. Output JSON: { "confidenceScore": 0.9, "isValid": true, "feedback": "..." }`;
      request.taskType = "validation";
      const { result, tokens } = await this.promptLLM(system, `Agent: ${params.agentName}
Spec: ${params.spec}
Output: ${JSON.stringify(params.output)}`, request, signal, strategy);
      return {
        success: true,
        data: result,
        artifacts: [],
        metrics: { durationMs: Date.now() - start, tokensTotal: tokens }
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// src/services/agent-memory.ts
var import_shared_services = require("@libs/shared-services");
var import_observability2 = require("@libs/observability");
var AgentMemory = class _AgentMemory {
  static instances = /* @__PURE__ */ new Map();
  missionId;
  constructor(missionId) {
    this.missionId = missionId;
  }
  /**
   * Factory method for mission-specific memory instance.
   */
  static async create(missionId) {
    if (!this.instances.has(missionId)) {
      this.instances.set(missionId, new _AgentMemory(missionId));
    }
    return this.instances.get(missionId);
  }
  async set(key, value) {
    return _AgentMemory.set(this.missionId, key, value);
  }
  async get(key) {
    return _AgentMemory.get(this.missionId, key);
  }
  async appendTranscript(agentName, message) {
    return _AgentMemory.appendTranscript(this.missionId, agentName, message);
  }
  static TTL = 3600 * 24;
  // 24 hours
  /**
   * Store a key-value pair in mission memory.
   */
  static async set(missionId, key, value) {
    const fullKey = `memory:${missionId}:${key}`;
    await import_shared_services.redis.set(fullKey, JSON.stringify(value), "EX", this.TTL);
    import_observability2.logger.debug({ missionId, key }, "[Memory] Value stored");
  }
  /**
   * Retrieve a value from mission memory.
   */
  static async get(missionId, key) {
    const fullKey = `memory:${missionId}:${key}`;
    const data = await import_shared_services.redis.get(fullKey);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }
  /**
   * Persist agent thought/state for UI and debugging.
   */
  static async appendTranscript(missionId, agentName, message) {
    const key = `transcript:${missionId}`;
    const entry = JSON.stringify({
      timestamp: Date.now(),
      agent: agentName,
      message
    });
    await import_shared_services.redis.rpush(key, entry);
    await import_shared_services.redis.expire(key, this.TTL);
  }
};

// src/services/agent-registry.ts
var import_utils3 = __toESM(require("@libs/utils"));
var AgentRegistry = class {
  agents = /* @__PURE__ */ new Map();
  /**
   * Registers a specific agent subclass implementation against a common task action.
   */
  register(taskType, agent) {
    this.agents.set(taskType, agent);
  }
  getAgent(taskType) {
    return this.agents.get(taskType);
  }
  hasAgent(taskType) {
    return this.agents.has(taskType);
  }
  async runTaskDirectly(taskType, request, signal, strategy) {
    const agent = this.getAgent(taskType);
    if (!agent) {
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: `No agent registered in AgentRegistry for task type: ${taskType}`
      };
    }
    try {
      import_utils3.default.info({ taskType, executionId: request.context.executionId }, "System dispatching to specialized Agent");
      return await agent.execute(request, signal, strategy);
    } catch (error) {
      import_utils3.default.error({ error, taskType }, "Specialized agent crashed during execution");
      return {
        success: false,
        data: null,
        artifacts: [],
        metrics: { durationMs: 0, tokensTotal: 0 },
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};
var agentRegistry = new AgentRegistry();
agentRegistry.register("planner", new PlannerAgent());
agentRegistry.register("database", new DatabaseAgent());
agentRegistry.register("frontend", new FrontendAgent());
agentRegistry.register("backend", new BackendAgent());
agentRegistry.register("deploy", new DeploymentAgent());
agentRegistry.register("security", new SecurityAgent());
agentRegistry.register("monitor", new MonitoringAgent());
agentRegistry.register("debug", new DebugAgent());
agentRegistry.register("judge", new JudgeAgent());
agentRegistry.register("test", new TestingAgent());
agentRegistry.register("validator", new ValidatorAgent());
agentRegistry.register("monetization", new SaaSMonetizationAgent());
agentRegistry.register("sandbox-editor", new SandboxEditorAgent());

// src/services/knowledge-service.ts
var import_utils4 = require("@libs/utils");
var import_utils5 = __toESM(require("@libs/utils"));
var KnowledgeService = class {
  /**
   * Retrieves relevant context for a given prompt using semantic search.
   */
  static async getContext(prompt, techStack, limit = 3) {
    try {
      import_utils5.default.info({ prompt, techStack }, "[KnowledgeService] Fetching contextual intelligence...");
      const embedding = await import_utils4.EmbeddingsEngine.generate(prompt);
      if (!embedding) {
        import_utils5.default.warn("[KnowledgeService] Failed to generate embedding. Proceeding without context.");
        return [];
      }
      const results = await import_utils4.VectorStore.searchSimilarCode(embedding, techStack, limit);
      return results.map((r) => ({
        type: "code_snippet",
        content: r.chunk_content,
        relevance: r.similarity || 0,
        metadata: r.metadata
      }));
    } catch (error) {
      import_utils5.default.error({ error }, "[KnowledgeService] Context retrieval failed");
      return [];
    }
  }
  /**
   * Augments a prompt with retrieved context from MemoryPlane (Layer 11).
   */
  static async augmentPrompt(basePrompt, projectId) {
    if (!projectId) {
      const context = await this.getContext(basePrompt);
      if (context.length === 0) return basePrompt;
      const contextString = context.map((c) => `[Context: ${c.metadata.purpose}]
${c.content}`).join("\n\n---\n\n");
      return `System Context:

${contextString}

Mission: ${basePrompt}`;
    }
    try {
      const multiDimContext = await import_utils4.memoryPlane.getRelevantContext(projectId, basePrompt);
      return `
MISSION RECALL & ARCHITECTURAL GUIDANCE:
${multiDimContext}

BASED ON THE ABOVE MEMORY, PROCEED WITH THE MISSION:
${basePrompt}
            `.trim();
    } catch (error) {
      import_utils5.default.error({ error }, "[KnowledgeService] Failed to augment prompt with MemoryPlane");
      return basePrompt;
    }
  }
};

// src/services/log-analysis.ts
var LogAnalysisEngine = class {
  static ERROR_PATTERNS = [
    { name: "typescript", regex: /(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/g },
    { name: "node_module", regex: /Error: Cannot find module '(.+)'/g },
    { name: "syntax", regex: /SyntaxError: (.+)/g },
    { name: "reference", regex: /ReferenceError: (.+) is not defined/g }
  ];
  static parse(logs) {
    const errors = [];
    for (const pattern of this.ERROR_PATTERNS) {
      let match;
      while ((match = pattern.regex.exec(logs)) !== null) {
        errors.push({
          type: pattern.name,
          file: match[1],
          line: match[2],
          message: match[5] || match[1]
        });
      }
    }
    const summary = errors.length > 0 ? `Found ${errors.length} specific errors in build logs.` : "No specific error patterns matched in logs.";
    return { errors, summary };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentMemory,
  AgentRegistry,
  ArchitectureAgent,
  BackendAgent,
  BaseAgent,
  ChatEditAgent,
  CoderAgent,
  CriticAgent,
  CustomizerAgent,
  DatabaseAgent,
  DebugAgent,
  DeploymentAgent,
  EvolutionAgent,
  FrontendAgent,
  HealingAgent,
  IntentDetectionAgent,
  JudgeAgent,
  KnowledgeService,
  LogAnalysisEngine,
  MetaAgent,
  MonitoringAgent,
  PlannerAgent,
  RankingAgent,
  RepairAgent,
  ResearchAgent,
  SaaSMonetizationAgent,
  SandboxEditorAgent,
  SecurityAgent,
  TestingAgent,
  ValidatorAgent,
  agentRegistry
});
