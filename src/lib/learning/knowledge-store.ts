import { supabaseAdmin } from '../supabaseAdmin';
import logger from '../logger';

export interface FixPattern {
    error_signature: string;
    fix_strategy: string;
    success_count: number;
}

export class KnowledgeStore {
    /**
     * Finds a matching fix pattern in the database based on the error signature.
     */
    static async findPattern(errorSignature: string): Promise<string | null> {
        try {
            const { data, error } = await supabaseAdmin
                .from('ai_fix_patterns')
                .select('fix_strategy')
                .eq('error_signature', errorSignature)
                .order('success_count', { ascending: false })
                .limit(1);

            if (error) throw error;
            return data?.[0]?.fix_strategy || null;
        } catch (e) {
            logger.warn({ error: e, signature: errorSignature }, '[KnowledgeStore] Failed to fetch pattern');
            return null;
        }
    }

    /**
     * Records a successful fix strategy for an error signature.
     */
    static async recordFix(errorSignature: string, fixStrategy: string) {
        try {
            // Upsert with increment logic
            const { error } = await supabaseAdmin.rpc('increment_fix_success', {
                sig: errorSignature,
                strategy: fixStrategy
            });

            if (error) {
                // Fallback to simple insert if RPC fails
                await supabaseAdmin
                    .from('ai_fix_patterns')
                    .insert([{
                        error_signature: errorSignature,
                        fix_strategy: fixStrategy,
                        success_count: 1
                    }]);
            }
        } catch (e) {
            logger.error({ error: e }, '[KnowledgeStore] Failed to record fix');
        }
    }
}
