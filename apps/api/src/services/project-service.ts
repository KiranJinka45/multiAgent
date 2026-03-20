console.log('[DEBUG] Loading project-service.ts...');
import { supabase } from '../lib/supabase';
import type { SupabaseClient } from 'C:/multiagentic_project/multiAgent-main/node_modules/.pnpm/@supabase+supabase-js@2.99.3/node_modules/@supabase/supabase-js/dist/index.cjs';
import { Project, ProjectFile } from '@libs/contracts';

export const projectService = {
    getSupabase: (supabaseServer?: SupabaseClient) => supabaseServer || supabase,

    async getProjects(orgId: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('org_id', orgId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return null;
        }
        return data as Project[];
    },

    async getPublicProjects(limit = 20, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('is_public', true)
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching public projects:', error);
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
            console.error('Error fetching project:', error);
            return null;
        }
        return data as Project;
    },

    async createProject(name: string, orgId: string, description?: string, type?: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: 'User not authenticated' };

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                user_id: user.id,
                org_id: orgId,
                name,
                description,
                project_type: type,
                status: 'draft'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
        }
        return { data: data as Project, error };
    },

    async getProjectFiles(projectId: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('project_files')
            .select('*')
            .eq('project_id', projectId)
            .order('path', { ascending: true });

        if (error) {
            console.error('Error fetching project files:', error);
            return null;
        }
        return data as ProjectFile[];
    },

    async updateFile(id: string, content: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('project_files')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating file:', error);
            return null;
        }
        return data as ProjectFile;
    },

    async updateProject(id: string, project: Partial<Project>, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('projects')
            .update(project)
            .eq('id', id)
            .select()
            .single();

        return { data: data as Project, error };
    },

    async deleteProject(id: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            return false;
        }
        return true;
    },

    async verifyProjectOwnership(projectId: string, userId: string, supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);
        const { data, error } = await supabase
            .from('projects')
            .select('user_id')
            .eq('id', projectId)
            .single();

        if (error || !data) {
            return false;
        }

        return data.user_id === userId;
    },

    async saveProjectFiles(projectId: string, files: { path: string, content: string, language?: string }[], supabaseServer?: SupabaseClient) {
        const supabase = this.getSupabase(supabaseServer);

        // 1. Deduplicate files by path (keep the last one)
        // Normalize paths to always start with a slash and have consistent slashes
        const uniqueFilesMap = new Map<string, any>();
        files.forEach(f => {
            if (f.path) {
                // Ensure starts with a single slash and uses forward slashes
                let normPath = f.path.replace(/\\/g, '/');
                if (!normPath.startsWith('/')) {
                    normPath = '/' + normPath;
                }

                uniqueFilesMap.set(normPath, {
                    ...f,
                    path: normPath,
                });
            }
        });
        const uniqueFiles = Array.from(uniqueFilesMap.values());

        // 2. Delete existing files
        const { error: deleteError } = await supabase.from('project_files').delete().eq('project_id', projectId);
        if (deleteError) {
            console.error('Error deleting existing project files:', deleteError);
            throw deleteError;
        }

        // 3. Insert new files in batches to avoid payload limits
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
                console.error(`Error saving batch ${i / batchSize}:`, error);
                throw error;
            }
        }
        return true;
    }
};
