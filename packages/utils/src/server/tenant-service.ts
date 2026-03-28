import { supabaseAdmin } from './supabase-utils';
import logger from '@packages/observability';

export interface Tenant {
    id: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    maxProjects: number;
    tokensUsed: number;
    maxTokens: number;
}

export class TenantService {
    /**
     * Retrieves tenant details for a specific user.
     * In a real system, a user might belong to multiple tenants.
     */
    static async getTenantForUser(userId: string): Promise<Tenant | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('tenants')
                .select('*')
                .eq('owner_id', userId)
                .single();

            if (error) throw error;
            if (!data) return null;

            return {
                id: data.id,
                name: data.name,
                plan: data.plan,
                maxProjects: data.max_projects,
                tokensUsed: data.tokens_used_this_month,
                maxTokens: data.max_tokens_monthly
            };
        } catch (e) {
            logger.error({ userId, error: e }, '[TenantService] Failed to fetch tenant');
            return null;
        }
    }

    /**
     * Checks if a tenant has exceeded their monthly AI token limit.
     */
    static async checkQuota(tenantId: string): Promise<boolean> {
        try {
            const { data, error } = await supabaseAdmin
                .from('tenants')
                .select('tokens_used_this_month, max_tokens_monthly')
                .eq('id', tenantId)
                .single();

            if (error) throw error;
            return data.tokens_used_this_month < data.max_tokens_monthly;
        } catch (e) {
            return false;
        }
    }

    /**
     * Records token usage for a tenant.
     */
    static async recordTokenUsage(tenantId: string, tokens: number) {
        try {
            await supabaseAdmin.rpc('increment_tenant_tokens', {
                t_id: tenantId,
                token_count: tokens
            });
        } catch (e) {
            logger.error({ tenantId, tokens, error: e }, '[TenantService] Failed to record usage');
        }
    }
}
