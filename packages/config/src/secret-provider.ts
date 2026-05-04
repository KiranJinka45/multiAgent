import { getSecrets } from "./aws-secrets"

export class SecretProvider {
  /**
   * Fetches secrets from AWS Secrets Manager and populates process.env.
   * This should be called at the very beginning of the service lifecycle.
   */
  static async bootstrap() {
    try {
      const secrets = await getSecrets()

      for (const key of Object.keys(secrets)) {
        process.env[key] = secrets[key]
      }

      console.log("[SecretProvider] Loaded secrets securely from AWS")
    } catch (error) {
      console.error("[SecretProvider] CRITICAL: Failed to bootstrap secrets:", error)
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    }
  }

  /**
   * Validates that all required secrets have been loaded.
   * This is called after bootstrap() or when the system is initialized.
   */
  static validate() {
    // Only strictly validate in production if we are not currently in the bootstrap phase
    // For now, we'll just log warnings to avoid blocking the bootstrap process itself
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    for (const key of required) {
      if (!process.env[key]) {
        console.warn(`[SecretProvider] WARNING: ${key} is missing from process.env`);
      }
    }
  }

  /**
   * Retrieves a secret value from process.env.
   */
  static get(key: string): string | undefined {
    return process.env[key];
  }
}
