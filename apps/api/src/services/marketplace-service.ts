import { supabase } from '@packages/supabase';

export interface Template {
  id: string;
  name: string;
  description: string;
  repo_url: string;
  tags: string[];
}

export const marketplaceService = {
  /**
   * Fetches curated templates from the marketplace.
   */
  async getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase.from('marketplace_templates').select('*');
    if (error) return this.getMockTemplates();
    return data;
  },

  /**
   * Mock templates for fallback/dev.
   */
  getMockTemplates(): Template[] {
    return [
      { id: '1', name: 'Next.js Turbo', description: 'High-performance Next.js starter', repo_url: 'https://github.com/templates/nextjs', tags: ['react', 'nextjs'] },
      { id: '2', name: 'Python FastAPI', description: 'Clean Python API with SQLite', repo_url: 'https://github.com/templates/fastapi', tags: ['python', 'api'] },
      { id: '3', name: 'Static Site', description: 'Minimalist Hugo portfolio', repo_url: 'https://github.com/templates/hugo', tags: ['hugo', 'static'] }
    ];
  }
};
