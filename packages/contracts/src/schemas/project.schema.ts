import { z } from 'zod';

/**
 * Zod Schema for Project creation/updates.
 * Ensures runtime safety and provides TypeScript inference.
 */
export const ProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  type: z.enum(['web_app', 'mobile_app', 'api', 'library']).default('web_app'),
  techStack: z.object({
    framework: z.string().optional(),
    styling: z.string().optional(),
    database: z.string().optional(),
  }).optional(),
});

export type ProjectInput = z.infer<typeof ProjectSchema>;

/**
 * Zod Schema for the full Project entity (matching DB).
 */
export const ProjectEntitySchema = ProjectSchema.extend({
  id: z.string().uuid(),
  user_id: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ProjectEntity = z.infer<typeof ProjectEntitySchema>;
