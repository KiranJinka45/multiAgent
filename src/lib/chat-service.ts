import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Chat, Message } from '@/types/chat';

const supabase = createClientComponentClient();

export const chatService = {
    // Create a new chat
    async createChat(title: string): Promise<{ chat: Chat | null, error: any }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { chat: null, error: 'User not authenticated' };
        }

        const { data, error } = await supabase
            .from('chats')
            .insert({ user_id: user.id, title })
            .select()
            .single();

        if (error) {
            console.error('Error creating chat (DB):', error);
            return { chat: null, error: error };
        }
        return { chat: data, error: null };
    },

    // Get all chats for the current user, ordered by most recent update
    async getChats(): Promise<Chat[]> {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching chats:', error);
            return [];
        }
        return data;
    },

    // Get details of a specific chat
    async getChat(chatId: string): Promise<Chat | null> {
        const { data, error } = await supabase
            .from('chats')
            .select('*')
            .eq('id', chatId)
            .single();

        if (error) return null;
        return data;
    },

    // Get messages for a specific chat
    async getMessages(chatId: string): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data;
    },

    // Add a message to a chat
    async addMessage(chatId: string, content: string, role: 'user' | 'assistant'): Promise<Message | null> {
        const { data, error } = await supabase
            .from('messages')
            .insert({ chat_id: chatId, content, role })
            .select()
            .single();

        if (error) {
            console.error('Error adding message:', error);
            return null;
        }

        // Update chat's updated_at timestamp
        await supabase
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId);

        return data;
    },

    // Delete a chat and all its messages (cascade handled by DB)
    async deleteChat(chatId: string): Promise<boolean> {
        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId);

        if (error) {
            console.error('Error deleting chat:', error);
            return false;
        }
        return true;
    },

    // Update chat title
    async updateChatTitle(chatId: string, title: string): Promise<boolean> {
        const { error } = await supabase
            .from('chats')
            .update({ title })
            .eq('id', chatId);

        if (error) {
            console.error('Error updating chat title:', error);
            return false;
        }
        return true;
    }
};
