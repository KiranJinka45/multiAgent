import { z } from 'zod';

/**
 * MISSION CONTRACTS
 */
export const MissionStartSchema = z.object({
    title: z.string().min(3).max(100),
    type: z.enum(['exploration', 'deployment', 'remediation', 'intelligence']),
    description: z.string().max(500).optional(),
});

/**
 * PROJECT CONTRACTS
 */
export const ProjectCreateSchema = z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(200).optional(),
    type: z.string().optional()
});

/**
 * LOG CONTRACTS
 */
export const LogIngestSchema = z.object({
    level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
    message: z.string().min(1),
    service: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
});
