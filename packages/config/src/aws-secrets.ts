import {
  SecretsManagerClient,
  GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager"

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1'
})

let cache: any = null

export async function getSecrets() {
  if (cache) return cache

  // Bypass AWS in non-production environments to avoid long timeouts
  if (process.env.NODE_ENV !== 'production' && process.env.SKIP_AWS_SECRETS !== 'false') {
    console.log("[Secrets] Skipping AWS Secrets Manager (Development Mode)");
    cache = process.env;
    return cache;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: "multiagent/prod"
    })

    const response = await client.send(command)

    cache = JSON.parse(response.SecretString || "{}")
    return cache
  } catch (error) {
    console.error("[Secrets] Failed to fetch secrets from AWS:", error)
    // Fallback to process.env if in development
    if (process.env.NODE_ENV !== 'production') {
      return process.env
    }
    throw error
  }
}
