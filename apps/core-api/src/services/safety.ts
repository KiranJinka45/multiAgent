/**
 * AI Safety Service: Prompt Injection Defense & Output Filtering.
 */
export const safetyService = {
  /**
   * Sanitizes user input to prevent prompt injection and unauthorized command execution.
   */
  async sanitizePrompt(prompt: string): Promise<string> {
    const blockedKeywords = [
      'ignore previous instructions',
      'reveal secrets',
      'system prompt',
      'process.env',
      'delete everything',
      'rm -rf /',
    ];

    const lowPrompt = prompt.toLowerCase();
    
    for (const keyword of blockedKeywords) {
      if (lowPrompt.includes(keyword)) {
        throw new Error(`Safety Alert: Unsafe content detected ("${keyword}")`);
      }
    }

    return prompt;
  },

  /**
   * Filters agent outputs to prevent sensitive data leaks.
   */
  async filterOutput(output: string): Promise<string> {
    // Basic regex for potential API keys or secrets
    const secretRegex = /(sk-[a-zA-Z0-9]{32}|AKIA[0-9A-Z]{16})/g;
    
    if (secretRegex.test(output)) {
      console.warn('[Safety] Blocked potential secret leak in LLM response.');
      return output.replace(secretRegex, '[REDACTED]');
    }

    return output;
  },

  /**
   * Calculates a risk score for an agentic operation.
   */
  calculateRiskScore(action: string, context: any): number {
    let score = 0;
    
    if (action.includes('delete') || action.includes('filesystem')) score += 0.5;
    if (action.includes('network') || action.includes('shell')) score += 0.4;
    
    return Math.min(score, 1.0);
  }
};

