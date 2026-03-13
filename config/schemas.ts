import { z } from 'zod';

export const ProjectGenerationSchema = z.object({
    projectId: z.string().min(1, { message: "Project ID is required" }),
    prompt: z.string().min(10, { message: "Prompt must be at least 10 characters" }).max(5000),
    template: z.string().optional(),
    executionId: z.string().min(1).optional(),
    isChaosTest: z.boolean().optional(),
    settings: z.object({
        model: z.enum(['fast', 'thinking', 'pro']).optional(),
        priority: z.boolean().optional(),
    }).optional(),
});

export const UserProfileSchema = z.object({
    email: z.string().email(),
    full_name: z.string().min(2).optional(),
});

export const StripeWebhookSchema = z.object({
    id: z.string(),
    type: z.string(),
    data: z.object({
        object: z.any(),
    }),
});
