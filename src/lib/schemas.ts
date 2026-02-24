import { z } from 'zod';

export const ProjectGenerationSchema = z.object({
    projectId: z.string().uuid({ message: "Invalid project ID format" }),
    prompt: z.string().min(10, { message: "Prompt must be at least 10 characters" }).max(5000),
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
