export interface Project {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    status: 'draft' | 'running' | 'completed' | 'failed' | 'cancelled' | 'brainstorming' | string;
    project_type?: 'web_app' | 'application' | 'landing_page' | 'other' | string;
    created_at: string;
    updated_at: string;
    is_public?: boolean;
    metadata?: Record<string, unknown>;
    preview_url?: string;
    thumbnail_url?: string;
}

export interface ProjectFile {
    id: string;
    project_id: string;
    path: string;
    content: string;
    language?: string;
    created_at: string;
    updated_at: string;
}

export type ProjectUpdate = Partial<Project>;
