export type Role = 'user' | 'assistant';

export interface Chat {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
    is_pinned?: boolean;
    is_archived?: boolean;
    is_public?: boolean;
}

export interface Message {
    id: string;
    chat_id: string;
    role: Role;
    content: string;
    created_at: string;
}
