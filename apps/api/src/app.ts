import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import axios from "axios";
import { logger } from "@packages/observability";
import { Request, Response } from "express";
import { env } from "@packages/config";
import { createHealthRouter, createSecurityMiddleware, createCsrfMiddleware, createPayloadSanitizerMiddleware } from "@packages/utils";
import authRoutes from "./routes/auth";
import systemHealthRoutes from "./routes/system-health";
import queueHealthRoutes from "./routes/queue-health";
import buildTimelineRoutes from "./routes/build-timeline";
import workerRoutes from "./routes/workers";
import governanceRoutes from "./routes/governance";
import generateRoutes from "./routes/generate";
import opsRoutes from "./routes/ops";
import certificationRoutes from "./routes/certification";
import { WatchdogService } from "./services/WatchdogService";
import { SLAEngineService } from "./services/SLAEngineService";

import { requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { requirePermission } from "@packages/auth-internal";
import { tierLimitMiddleware } from "./middleware/tier-limiter";

const app: express.Application = express();

app.use(cors());
app.use(cookieParser());
app.use(createSecurityMiddleware());
app.use(express.json());
app.use(createPayloadSanitizerMiddleware());

// Phase 9/10: High Availability & Governance
WatchdogService.start();
SLAEngineService.start();

// No dev auth bypass - strictly enforced production flow

/**
 * DIRECT-CONNECT GATEWAY (V17.2)
 * Principle: Absolute Connectivity
 * Bypasses Next.js proxy to eliminate handshake refusal.
 */


// SERVICE REGISTRY - Aligned with the production env.ts
const SERVICES = {
  agents: env.CORE_ENGINE_URL,
  missions: env.CORE_ENGINE_URL,
  logs: env.CORE_ENGINE_URL,
  auth: `http://127.0.0.1:${env.AUTH_SERVICE_PORT}`,
};

/**
 * EXPLICIT FORWARDER
 */
async function forward(req: Request, res: Response, targetBase: string) {
  try {
    const authReq = req as AuthenticatedRequest;
    const path = req.originalUrl.replace(/^\/api/, "");
    const url = `${targetBase}${path}`;

    // Prepare identity headers from verified user context
    const identityHeaders: Record<string, string> = {};
    if (authReq.user) {
      // Phase 5: Strict Tenant Isolation Audit
      if (req.headers["x-tenant-id"] && req.headers["x-tenant-id"] !== authReq.user.tenantId) {
        logger.warn({
          userId: authReq.user.id,
          providedTenant: req.headers["x-tenant-id"],
          actualTenant: authReq.user.tenantId
        }, "[SECURITY] Tenant Breach Attempt Blocked");
      }

      // Ensure the forwarded tenant ID ALWAYS matches the authenticated user context
      identityHeaders["x-user-id"] = authReq.user.id;
      identityHeaders["x-tenant-id"] = authReq.user.tenantId;
      identityHeaders["x-roles"] = JSON.stringify(authReq.user.roles);
    }

    const response = await axios({
      method: req.method as any,
      url,
      data: req.body,
      headers: { 
        "Content-Type": "application/json",
        "x-internal-token": env.INTERNAL_SERVICE_TOKEN,
        ...req.headers,
        ...identityHeaders,
        host: new URL(targetBase).host 
      },
      validateStatus: () => true 
    });

    res.status(response.status).json(response.data);
  } catch (err: any) {
    res.status(502).json({ 
        error: "Neural Mesh Link Disrupted", 
        detail: "Service unreachable via Gateway Forwarder" 
    });
  }
}

// HEALTH & STATUS (Standardized)
app.use(createHealthRouter({ serviceName: 'api' }));

// AUTH ROUTES (Public)
app.use("/api/auth", authRoutes);

// GLOBAL ACTIVE-ACTIVE ROUTER
const getRegionalTarget = (req: Request, service: keyof typeof SERVICES) => {
    const region = req.header('x-region') || 'us-east-1';
    
    // Logic: If region is not local, use regional endpoint if configured
    if (region === 'eu-west-1' && env.CORE_ENGINE_EU_URL) {
        return env.CORE_ENGINE_EU_URL;
    }
    
    return SERVICES[service];
};

// CORE ROUTES (Protected)
app.use("/api/agents", requireAuth, tierLimitMiddleware, requirePermission('agents:read'), (req, res) => forward(req, res, getRegionalTarget(req, 'agents')));
app.use("/api/missions", requireAuth, tierLimitMiddleware, requirePermission('missions:read'), (req, res) => forward(req, res, getRegionalTarget(req, 'missions')));
app.use("/api/logs", requireAuth, tierLimitMiddleware, (req, res) => forward(req, res, getRegionalTarget(req, 'logs')));

// OPERATIONAL MONITORING (Internal/Protected)
app.use("/api/system-health", requireAuth, systemHealthRoutes);
app.use("/api/queue-health", requireAuth, queueHealthRoutes);
app.use("/api/build-timeline", requireAuth, buildTimelineRoutes);
app.use("/api/workers", requireAuth, workerRoutes);
app.use("/api/governance", requireAuth, governanceRoutes);
app.use("/api/generate", requireAuth, generateRoutes);
app.use("/api/build", requireAuth, generateRoutes);
app.use("/api/ops", requireAuth, opsRoutes);
app.use("/api/system", certificationRoutes);


// SYSTEM STATUS
app.get("/api/system/status", (_, res) => {
    res.json({
        status: "operational",
        gateway: "v17.2-direct",
        mesh: "Absolute Gateway Union"
    });
});

export default app;

