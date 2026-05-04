import { getSupabaseClient } from '../lib/mock-api';
import type { SupabaseClient } from '../lib/mock-api';
import { ProjectV1 as Project, ProjectFile } from '../types/local-contracts';
import { logger } from '@packages/observability';

export const projectService = {
    getSupabase: (supabaseServer?: SupabaseClient) => supabaseServer || getSupabaseClient(),

    async getProjects(supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            logger.error({ error }, 'Error fetching projects');
            return null;
        }
        return data as Project[];
    },

    async getProject(id: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            logger.error({ error }, 'Error fetching project');
            return null;
        }
        return data as Project;
    },

    async saveProjectFiles(projectId: string, files: { path: string, content: string, language?: string }[], supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);

        // 1. Deduplicate files by path
        const uniqueFilesMap = new Map<string, any>();
        files.forEach(f => {
            if (f.path) {
                let normPath = f.path.replace(/\\/g, '/');
                if (!normPath.startsWith('/')) normPath = '/' + normPath;
                uniqueFilesMap.set(normPath, { ...f, path: normPath });
            }
        });
        const uniqueFiles = Array.from(uniqueFilesMap.values());

        // 2. Delete existing files
        const { error: deleteError } = await supabase.from('project_files').delete().eq('project_id', projectId);
        if (deleteError) {
            logger.error({ error: deleteError }, 'Error deleting existing project files');
            throw deleteError;
        }

        // 3. Insert new files in batches
        const batchSize = 50;
        for (let i = 0; i < uniqueFiles.length; i += batchSize) {
            const batch = uniqueFiles.slice(i, i + batchSize).map(f => ({
                project_id: projectId,
                path: f.path,
                content: f.content,
                language: f.language || f.path.split('.').pop()
            }));

            const { error } = await supabase.from('project_files').insert(batch);
            if (error) {
                logger.error({ error }, `Error saving batch ${i / batchSize}`);
                throw error;
            }
        }
        return true;
    }
};




