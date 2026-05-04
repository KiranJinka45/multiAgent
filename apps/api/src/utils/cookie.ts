import { CookieOptions } from "express";
import { env } from "@packages/config";

/**
 * Access Token Cookie Settings (Short-lived)
 */
export const ACCESS_TOKEN_COOKIE_NAME = "access_token";
export const getAccessTokenOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
});

/**
 * Refresh Token Cookie Settings (Long-lived)
 */
export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
export const getRefreshTokenOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/api/auth/refresh", // Only sent to the refresh endpoint
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});

/**
 * Clear Cookie Utility
 */
export const clearCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
};
