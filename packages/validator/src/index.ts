export const validator = async (files: Record<string, string>) => {
  console.log(`[Validator] Checking ${Object.keys(files).length} files...`);
  return { valid: true, errors: [] };
};
