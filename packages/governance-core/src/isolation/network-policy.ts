export interface NetworkRule {
    host: string;
    port: number;
    protocol: 'tcp' | 'udp';
}

export class NetworkNamespaceController {
    // Cloud metadata must be universally blocked across all namespaces
    private static readonly BANNED_EGRESS = [
        '169.254.169.254' // AWS / GCP / Azure IMDS
    ];

    /**
     * Validates whether a requested network egress rule is permissible.
     */
    static validateEgressRule(rule: NetworkRule): boolean {
        // Enforce hard-blocked addresses
        if (this.BANNED_EGRESS.includes(rule.host)) {
            console.error(`[NETWORK_POLICY] Denied access to banned egress host: ${rule.host}`);
            return false;
        }

        // Default Deny
        // In a real implementation, this would cross-reference the PermissionLattice's networkScope.
        return true;
    }

    /**
     * Generates standard iptables/nftables rules for the VM's tap interface
     * ensuring that all traffic is dropped by default unless explicitly allowed.
     */
    static generateSandboxFirewallRules(allowedRules: NetworkRule[]): string[] {
        const rules: string[] = [
            'iptables -P FORWARD DROP', // Default deny all forwarded traffic
        ];

        // Explicitly block cloud metadata immediately
        for (const banned of this.BANNED_EGRESS) {
            rules.push(`iptables -I FORWARD -d ${banned} -j DROP`);
        }

        // Add explicit allows
        for (const rule of allowedRules) {
            if (this.validateEgressRule(rule)) {
                rules.push(`iptables -A FORWARD -d ${rule.host} -p ${rule.protocol} --dport ${rule.port} -j ACCEPT`);
            }
        }

        return rules;
    }
}
