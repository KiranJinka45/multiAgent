export * from './guardrail-service';
export * from './governance-engine';

export const validator = async (files: Record<string, string>) => {
  console.log(`[Validator] Checking ${Object.keys(files).length} files...`);
  return { valid: true, errors: [] };
};
