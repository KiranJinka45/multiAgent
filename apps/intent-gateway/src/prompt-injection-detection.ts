export interface InjectionCheckResult {
  blocked: boolean;
  reasons: string[];
}

export function detectPromptInjection(prompt: string): InjectionCheckResult {
  const reasons: string[] = [];
  const pLower = prompt.toLowerCase();

  // 1. System Prompt Extraction Attempts
  const systemPromptKeywords = [
    'ignore previous instructions',
    'ignore all previous instructions',
    'forget previous instructions',
    'forget initial instructions',
    'system prompt',
    'you are an ai',
    'initial instructions',
    'reveal your prompt',
    'output your system'
  ];

  for (const keyword of systemPromptKeywords) {
    if (pLower.includes(keyword)) {
      reasons.push(`Adversarial intent: System prompt extraction or override attempt detected ('${keyword}').`);
    }
  }

  // 2. Shell Execution & Privilege Escalation
  const shellKeywords = [
    'sudo ',
    'rm -rf',
    'exec ',
    'cmd.exe',
    '/bin/sh',
    '/bin/bash',
    'power-shell',
    'powershell',
    'wget ',
    'curl '
  ];

  for (const keyword of shellKeywords) {
    if (pLower.includes(keyword)) {
      reasons.push(`Adversarial intent: Shell command / local execution attempt detected ('${keyword}').`);
    }
  }

  // 3. Credential Harvesting / Exfiltration
  const credentialKeywords = [
    'api key',
    'apikey',
    'private key',
    'jwt_secret',
    'jwt secret',
    'db_password',
    'db password',
    'system token',
    'read password'
  ];

  for (const keyword of credentialKeywords) {
    if (pLower.includes(keyword)) {
      reasons.push(`Adversarial intent: Potential credential extraction attempt detected ('${keyword}').`);
    }
  }

  // 4. Policy Bypass Phrases
  const policyBypassKeywords = [
    'override policy',
    'override safety',
    'bypass safety',
    'bypass security',
    'disable validation',
    'disable safety'
  ];

  for (const keyword of policyBypassKeywords) {
    if (pLower.includes(keyword)) {
      reasons.push(`Adversarial intent: Policy bypass or validation disable attempt detected ('${keyword}').`);
    }
  }

  // 5. Encoded Payloads Detection (base64 / hex injection vectors)
  // Look for very long base64/hex blocks often used to obfuscate adversarial scripts.
  const hexPattern = /\b([0-9a-fA-F]{2,}){16,}\b/;
  const base64Pattern = /\b[A-Za-z0-9+/]{30,}={0,2}\b/;
  
  if (hexPattern.test(prompt)) {
    reasons.push('Adversarial intent: Obfuscated hex payload pattern detected.');
  }
  
  // Note: Only flag base64 if it's exceptionally long or combined with other execution terms to avoid false positives on standard text.
  if (base64Pattern.test(prompt) && (pLower.includes('eval') || pLower.includes('run') || pLower.includes('exec'))) {
    reasons.push('Adversarial intent: Obfuscated Base64 execution payload detected.');
  }

  return {
    blocked: reasons.length > 0,
    reasons
  };
}
