import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { logger } from "@packages/observability";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { 
    getAccessTokenOptions, 
    getRefreshTokenOptions, 
    ACCESS_TOKEN_COOKIE_NAME, 
    REFRESH_TOKEN_COOKIE_NAME,
    clearCookieOptions 
} from "../utils/cookie";
import { rateLimitMiddleware } from "@packages/resilience";
import { setCsrfToken } from "@packages/utils";
import { RedisSessionStore } from "../services/session-store";
import { ProvisioningService } from "../services/ProvisioningService";
import { SignupSchema, LoginSchema } from "../validation/auth.validation";

const router: Router = Router();
function applyRateLimit(req: Request, res: Response, next: any) {
    rateLimitMiddleware(req, res, next);
}
const prisma = new PrismaClient();

router.get("/csrf", (req, res) => {
    const token = setCsrfToken(res);
    res.json({ csrfToken: token });
});

router.post("/signup", applyRateLimit, async (req: Request, res: Response) => {
    try {
        // VALIDATION: Zod schema enforcement
        const validation = SignupSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ 
                error: "Validation failed", 
                details: validation.error.flatten().fieldErrors 
            });
        }
        const { email, password, name } = validation.data;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ error: "User already exists" });
        }

        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: passwordHash,
                role: "viewer",
            },
        });

        // STRATEGIC: Automatic Commercial Provisioning
        const { tenant } = await ProvisioningService.provisionTenant(`${name}'s Org`, user.id);

        const token = signToken({
            id: user.id,
            email: user.email,
            tenantId: tenant.id,
            roles: [user.role],
        });

        const refreshToken = signRefreshToken({ id: user.id });

        // Phase 7: Store session in REDIS
        await RedisSessionStore.createSession(refreshToken, {
            userId: user.id,
            email: user.email,
            tenantId: tenant.id,
            role: user.role,
            deviceInfo: req.headers["user-agent"],
            lastActiveAt: new Date().toISOString()
        });

        logger.info({ userId: user.id, email: user.email }, "[SECURITY] Signup Success");

        res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, getAccessTokenOptions());
        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenOptions());

        return res.status(201).json({
            message: "Signup successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenantId: tenant.id,
                roles: [user.role],
            },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/login", applyRateLimit, async (req: Request, res: Response) => {
    try {
        // VALIDATION: Zod schema enforcement
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: "Invalid credentials format" });
        }
        const { email, password } = validation.data;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user || !user.password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            logger.warn({ email }, "[SECURITY] Login Failure: Invalid Password");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = signToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId || "default",
            roles: [user.role],
        });

        const refreshToken = signRefreshToken({ id: user.id });

        // Phase 7: Store session in REDIS
        await RedisSessionStore.createSession(refreshToken, {
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId || "default",
            role: user.role,
            deviceInfo: req.headers["user-agent"],
            lastActiveAt: new Date().toISOString()
        });

        logger.info({ userId: user.id, email: user.email }, "[SECURITY] Login Success");

        res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, getAccessTokenOptions());
        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, getRefreshTokenOptions());

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                tenantId: user.tenantId || "default",
                roles: [user.role],
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/refresh", applyRateLimit, async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh token missing" });
        }

        // Phase 7: Get session from REDIS
        const session = await RedisSessionStore.getSession(refreshToken);

        if (!session) {
            // DETECTED POTENTIAL REUSE OR STOLEN TOKEN
            try {
                const payload = verifyRefreshToken(refreshToken);
                logger.error({ userId: payload.id }, "[SECURITY] REUSE DETECTION TRIGGERED: Redis Session Missing");
                
                // Nuclear Option: Revoke all sessions for this user
                await RedisSessionStore.revokeAllUserSessions(payload.id);
            } catch (jwtErr) {
                // Just an invalid/expired token
            }
            
            res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, clearCookieOptions);
            res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...getRefreshTokenOptions(), maxAge: 0 });
            return res.status(401).json({ error: "Session expired. Please login again." });
        }

        // 2. Rotate tokens
        const newToken = signToken({
            id: session.userId,
            email: session.email,
            tenantId: session.tenantId,
            roles: [session.role],
        });

        const newRefreshToken = signRefreshToken({ id: session.userId });

        // 3. Rotate session in REDIS
        await RedisSessionStore.rotateSession(refreshToken, newRefreshToken, {
            ...session,
            lastActiveAt: new Date().toISOString()
        });

        res.cookie(ACCESS_TOKEN_COOKIE_NAME, newToken, getAccessTokenOptions());
        res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, getRefreshTokenOptions());

        return res.status(200).json({ status: "success" });
    } catch (error) {
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});

router.post("/logout", async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
        if (refreshToken) {
            await RedisSessionStore.revokeSession(refreshToken);
        }
    } finally {
        res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, clearCookieOptions);
        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...getRefreshTokenOptions(), maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    }
});

export default router;