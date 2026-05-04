import { Router } from "express";
import { CostGovernanceService } from "../services/CostGovernanceService";
import { logger } from "@packages/observability";

const router: Router = Router();

/**
 * GET /api/governance/metrics
 * Returns real-time burn rate and efficiency metrics.
 */
router.get("/metrics", async (req, res) => {
    try {
        const metrics = await CostGovernanceService.getMetrics();
        res.json(metrics);
    } catch (err: any) {
        logger.error({ error: err.message }, "[GOVERNANCE] Failed to fetch metrics");
        res.status(500).json({ error: "Internal Governance Error" });
    }
});

/**
 * GET /api/governance/safety-score
 * Placeholder for security compliance score
 */
router.get("/safety-score", async (req, res) => {
    res.json({
        safetyScore: 98,
        policyCompliance: "100%",
        activeGuards: ["JailbreakDetection", "PromptInjectionPrevention", "BannedKeywords"]
    });
});

export default router;
