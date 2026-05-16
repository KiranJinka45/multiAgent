export enum Role {
    SRE = 'sre',
    COMPLIANCE = 'compliance',
    EXEC = 'exec',
    AUDITOR = 'auditor'
}

export interface RoleConfig {
    name: string;
    allowedCommands: string[];
    description: string;
}

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
    [Role.SRE]: {
        name: 'Site Reliability Engineer',
        allowedCommands: ['recovery', 'infra', 'diag', 'identity', 'governance', 'graph', 'ops', 'econ', 'global', 'pilot', 'stewardship', 'longevity', 'chaos', 'replay', 'federation', 'audit', 'product', 'gtm', 'scaling', 'exec'],
        description: 'Technical operations, recovery, and infrastructure stability.'
    },
    [Role.COMPLIANCE]: {
        name: 'Compliance Officer',
        allowedCommands: ['infra', 'diag', 'identity', 'governance', 'graph', 'econ', 'global', 'certify', 'pilot', 'stewardship', 'longevity', 'chaos', 'replay', 'federation', 'audit', 'product', 'gtm', 'scaling', 'exec'],
        description: 'Audit reporting, regulatory alignment, and external validation.'
    },
    [Role.EXEC]: {
        name: 'Executive Stakeholder',
        allowedCommands: ['infra', 'diag', 'econ', 'gtm', 'scaling', 'exec'],
        description: 'High-level platform stability and reliability metrics.'
    },
    [Role.AUDITOR]: {
        name: 'Institutional Auditor',
        allowedCommands: ['infra', 'diag', 'identity', 'governance', 'graph', 'econ', 'global', 'certify', 'pilot', 'stewardship', 'longevity', 'chaos', 'replay', 'federation', 'audit', 'product', 'gtm', 'scaling', 'exec'],
        description: 'Forensic evidence verification and independent validation.'
     }
};
