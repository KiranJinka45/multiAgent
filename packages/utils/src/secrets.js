"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecrets = getSecrets;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client = new client_secrets_manager_1.SecretsManagerClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
let cache = null;
async function getSecrets() {
    if (cache)
        return cache;
    try {
        const command = new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: "multiagent/prod"
        });
        const response = await client.send(command);
        cache = JSON.parse(response.SecretString || "{}");
        return cache;
    }
    catch (error) {
        console.error("[Secrets] Failed to fetch secrets from AWS:", error);
        // Fallback to process.env if in development
        if (process.env.NODE_ENV !== 'production') {
            return process.env;
        }
        throw error;
    }
}
//# sourceMappingURL=secrets.js.map