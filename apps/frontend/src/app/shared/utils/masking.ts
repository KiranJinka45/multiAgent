export function maskSensitiveData(text: string): string {
  if (!text) return text;
  
  // Mask potential API keys, passwords, etc.
  let masked = text;
  
  // Basic regex for API keys/tokens (example: key-xxxxxxxx)
  masked = masked.replace(/(api[_-]?key|password|secret|token)["\s:]+["']?([a-zA-Z0-9_\-]{8,})["']?/gi, (match, p1, p2) => {
    return `${p1}: ********`;
  });

  return masked;
}
