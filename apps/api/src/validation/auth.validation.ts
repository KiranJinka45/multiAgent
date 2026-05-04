import { z } from "zod";

/**
 * Authentication Payload Schemas
 */

export const SignupSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
});

export const LoginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
});

export const RefreshSchema = z.object({
    // Refresh token is usually in a cookie, but we can validate the presence if needed
    // or validate the payload if it's sent in the body.
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
