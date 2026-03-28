import { TEMPLATE_REGISTRY } from '../../core-engine/src/template-registry';

export const planner = async (prompt: string) => {
  console.log(`[Planner] Planning for prompt: ${prompt}`);
  
  // Check if prompt IS a template ID or contains one
  const template = TEMPLATE_REGISTRY.find(t => t.id === prompt || prompt.toLowerCase().includes(t.name.toLowerCase()));
  
  if (template) {
     return {
        projectName: template.name,
        pages: ["dashboard"],
        components: ["chart", "table"],
        template: 'vite-react-tailwind',
        templateId: template.id
     };
  }

  return {
    projectName: 'Dynamic Project',
    pages: ["dashboard"],
    components: ["chart", "table"],
    template: 'vite-react-tailwind'
  };
};
