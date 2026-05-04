import { Request, Response, NextFunction } from 'express';

/**
 * RBAC Middleware: Enforces role-based access control.
 */
export const authorize = (requiredRole: 'ADMIN' | 'DEV' | 'VIEWER') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let userRole = req.headers['x-user-role']; 
    let orgId = req.headers['x-org-id'];
    const userEmail = req.headers['x-user-email'] as string;

    // Auto-map organization if context is missing but SSO email is present
    if (!orgId && userEmail) {
      const { mapDomainToOrg } = require('../../auth-service/sso/oidc');
      orgId = mapDomainToOrg(userEmail);
    }

    if (!userRole || !orgId) {
      return res.status(401).json({ error: 'Missing organization or identity context' });
    }

    const rolePriority = { 'ADMIN': 3, 'DEV': 2, 'VIEWER': 1 };
    
    if (rolePriority[userRole as keyof typeof rolePriority] >= rolePriority[requiredRole]) {
      // Inject resolved orgId back into request for downstream services
      req.headers['x-org-id'] = orgId;
      return next();
    }

    return res.status(403).json({ error: 'Permission denied' });
  };
};

