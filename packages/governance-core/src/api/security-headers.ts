/**
 * 11.8 Freeze: Browser Security Policy & Isolation
 * 
 * Enforces strict Content Security Policy, Cross-Origin Isolation, 
 * and Trusted Types to protect the SRE Governance Console from XSS, 
 * iframe-jacking, and malicious extensions.
 */

export const applyGovernanceSecurityHeaders = (req: any, res: any, next: any) => {
  // 1. Content Security Policy (CSP)
  // Strictly disables inline scripts, eval, and unauthorized external assets.
  // Requires Trusted Types for DOM manipulations.
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'", // No 'unsafe-inline' or 'unsafe-eval'
    "style-src 'self' 'unsafe-inline'", // Angular requires some inline styles, but no external stylesheets
    "img-src 'self' data:", 
    "connect-src 'self'", // Telemetry polling must go to same origin
    "font-src 'self'",
    "object-src 'none'", // Block plugins (Flash, Java, etc.)
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'", // Block iframe embedding (Clickjacking protection)
    "require-trusted-types-for 'script'" // Force Trusted Types API for DOM XSS prevention
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // 2. Cross-Origin Embedder Policy (COEP)
  // Requires all embedded resources to opt-in via CORS, preventing cross-origin leaks
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  // 3. Cross-Origin Opener Policy (COOP)
  // Isolates the browsing context, preventing window reference attacks
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

  // 4. Cross-Origin Resource Policy (CORP)
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // 5. Strict Transport Security (HSTS)
  // Forces HTTPS for 2 years, including subdomains
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // 6. X-Content-Type-Options
  // Prevents MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 7. X-Frame-Options (Legacy support for older browsers, redundant with CSP frame-ancestors)
  res.setHeader('X-Frame-Options', 'DENY');

  // 8. Referrer Policy
  // Prevents leaking path/query data in the Referer header
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};
