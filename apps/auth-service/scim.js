"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scimHandler = void 0;
/**
 * SCIM v2 User Provisioning Endpoint.
 * Supports auto-creation and sync from IdPs (Okta, Azure AD).
 */
exports.scimHandler = {
    async createUser(req, res) {
        const { userName, emails, name } = req.body;
        console.log(`[SCIM] Provisioning user: ${userName} (${emails[0]?.value})`);
        // In a real implementation, this would upsert into the DB
        const user = {
            id: `scim-${Math.random().toString(36).substr(2, 9)}`,
            email: emails[0]?.value,
            displayName: name?.formatted || userName,
            active: true,
        };
        return res.status(201).json(user);
    },
    async patchUser(req, res) {
        const { id } = req.params;
        console.log(`[SCIM] Patching user ${id}`);
        return res.status(200).json({ status: 'updated' });
    },
    async deleteUser(req, res) {
        const { id } = req.params;
        console.log(`[SCIM] Deprovisioning user ${id}`);
        return res.status(204).send();
    }
};
//# sourceMappingURL=scim.js.map