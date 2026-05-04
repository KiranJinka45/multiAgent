import { Request, Response } from 'express';
/**
 * SCIM v2 User Provisioning Endpoint.
 * Supports auto-creation and sync from IdPs (Okta, Azure AD).
 */
export declare const scimHandler: {
    createUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    patchUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
