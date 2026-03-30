import { z } from "zod";

/** USER */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "user"]),
});

/** PROJECT */
export const ProjectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  organizationId: z.string(),
  createdAt: z.string().optional(),
});

/** CREATE PROJECT INPUT */
export const CreateProjectSchema = z.object({
  name: z.string().min(1),
});

export type User = z.infer<typeof UserSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
