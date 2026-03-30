import { z } from "zod";

export const ApiResponse = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type ApiResponse = z.infer<typeof ApiResponse>;
