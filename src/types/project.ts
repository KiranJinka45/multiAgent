export interface Project {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    status: string; // 'draft' | 'brainstorming' | 'generating' | 'completed' | 'failed' | etc.
    project_type: string | null;
    deployment_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectFile {
    id: string;
    project_id: string;
    path: string;
    content: string | null;
    language: string | null;
    created_at: string;
    updated_at: string;
}
