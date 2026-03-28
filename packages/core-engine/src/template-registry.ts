export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  category: 'saas' | 'portfolio' | 'landing' | 'admin' | 'blog';
}

export const TEMPLATE_REGISTRY: AppTemplate[] = [
  {
    id: 'saas-dashboard',
    name: 'SaaS Metrics Dashboard',
    description: 'Sleek dark-mode financial dashboard with real-time charts.',
    category: 'saas',
    basePrompt: "Create a high-performance SaaS dashboard for a Fintech startup. Include a real-time revenue chart using Recharts, a table with recent transactions, and a 'Smart Insights' panel at the top. Use a sleek dark-mode aesthetic with glassmorphism."
  },
  {
    id: 'portfolio-pro',
    name: 'Modern Agency Portfolio',
    description: 'Bold typography and masonry grid for creatives.',
    category: 'portfolio',
    basePrompt: "Build a modern design agency portfolio. I want a bold hero section with big typography, a masonry grid for project images, and a floating contact button. Use Framer Motion for smooth scroll animations and 'Inter' font."
  },
  {
    id: 'ai-landing',
    name: 'AI Product Landing Page',
    description: 'Conversion-optimized page with featuer grids and pricing.',
    category: 'landing',
    basePrompt: "Generate a high-conversion landing page for an AI Productivity tool. Must include: 1. Hero with a big CTA and social proof. 2. A 3-column features section with icons. 3. A FAQ section. 4. A pricing table. Make it look like Linear's website (gradient borders, sleek dark theme)."
  },
  {
    id: 'admin-panel',
    name: 'Operations Admin Panel',
    description: 'Functional dashboard for internal tools and monitoring.',
    category: 'admin',
    basePrompt: "Build an internal operations panel for managing a fleet of delivery drones. Include a map view (placeholder), an active drone status table, and an alert system on the right. Dark mode with industrial red accents."
  },
  {
    id: 'minimal-blog',
    name: 'Minimalist Blog Engine',
    description: 'Clean reading experience with search and author metadata.',
    category: 'blog',
    basePrompt: "Create a minimal, distraction-free blog engine. Listing page with big cards, search functionality, and a beautiful reading view for articles. Support 'Read Time' and 'Author' metadata. Use Outfit font."
  }
];

export function getTemplate(id: string): AppTemplate | undefined {
  return TEMPLATE_REGISTRY.find(t => t.id === id);
}
