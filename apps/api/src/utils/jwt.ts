import jwt from "jsonwebtoken";
import { env, SecretProvider } from "@packages/config";

const JWT_SECRET = SecretProvider.get('JWT_SECRET');
const JWT_EXPIRES_IN = "7d"; // Consider moving to config later

const JWT_REFRESH_SECRET = SecretProvider.get('JWT_REFRESH_SECRET');
const JWT_REFRESH_EXPIRES_IN = "30d";

export type AuthTokenPayload = {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
};

export function signToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET as string, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

export function verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, JWT_SECRET as string) as AuthTokenPayload;
}

export function signRefreshToken(payload: { id: string }): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET as string, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
}

export function verifyRefreshToken(token: string): { id: string } {
    return jwt.verify(token, JWT_REFRESH_SECRET as string) as { id: string };
}