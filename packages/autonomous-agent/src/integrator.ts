import fs from 'fs-extra';
import { logger } from '@packages/utils';

export async function registerComponent(registryPath: string, componentName: string, filePath: string) {
  if (!(await fs.pathExists(registryPath))) {
    logger.warn({ registryPath }, 'Registry file not found for integration.');
    return;
  }

  let content = await fs.readFile(registryPath, 'utf-8');
  if (!content.includes(componentName)) {
    logger.info({ componentName }, 'Auto-registering component in registry...');
    // Simplified regex-based registration
    content = content.replace('// Auto-registration hook', `// Auto-registration hook\nimport { ${componentName} } from '${filePath}';\nregistry.register('${componentName}', new ${componentName}());`);
    await fs.writeFile(registryPath, content);
  }
}
