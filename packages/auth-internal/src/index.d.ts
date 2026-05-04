import { NextFunction } from 'express';
export interface UserContext {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
}
export type Permission = 'agents:read' | 'agents:write' | 'missions:read' | 'missions:write' | 'projects:read' | 'projects:write' | 'logs:read' | 'billing:manage' | 'system:manage';
export declare const ROLE_PERMISSIONS: Record<string, Permission[]>;
/**
 * INTERNAL AUTH MIDDLEWARE
 */
export declare function internalAuth(allowedServices?: string[]): (req: any, res: any, next: NextFunction) => any;
/**
 * REQUIRE PERMISSION MIDDLEWARE
 */
/**
 * REQUIRE PERMISSION MIDDLEWARE
 */
export declare function requirePermission(requiredPermission: Permission): (req: any, res: any, next: NextFunction) => any;
export declare function signInternalToken(serviceName: string): string;
/**
 * USER AUTH MIDDLEWARE (Public/User-Facing)
 */
export declare function userAuth(options?: {
    allowDevBypass?: boolean;
}): (req: any, res: any, next: NextFunction) => Promise<any>;
//# sourceMappingURL=index.d.ts.map