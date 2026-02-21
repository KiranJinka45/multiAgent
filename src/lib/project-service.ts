import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Project, ProjectFile } from '@/types/project';

export const projectService = {
    getSupabaseClient: () => createClientComponentClient(),

    async getProjects(supabaseServer?: any) {
        const supabase = supabaseServer || createClientComponentClient();
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching projects:', error);
            return null;
        }
        return data as Project[];
    },

    async getProject(id: string, supabaseServer?: any) {
        const supabase = supabaseServer || createClientComponentClient();
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

    async createProject(name: string, description?: string, type?: string) {
        const supabase = createClientComponentClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { data: null, error: 'User not authenticated' };

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                user_id: user.id,
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

    async getProjectFiles(projectId: string) {
        const supabase = createClientComponentClient();
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

    async updateFile(id: string, content: string) {
        const supabase = createClientComponentClient();
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

    async updateProject(id: string, project: Partial<Project>) {
        const supabase = createClientComponentClient();
        const { data, error } = await supabase
            .from('projects')
            .update(project)
            .eq('id', id)
            .select()
            .single();

        return { data: data as Project, error };
    },

    async deleteProject(id: string) {
        const supabase = createClientComponentClient();
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            return false;
        }
        return true;
    }
};
