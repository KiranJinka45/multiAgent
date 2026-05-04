import { Issuer } from 'openid-client';

/**
 * OIDC Client Generator for Enterprise SSO.
 */
export async function getOIDCClient() {
  if (!process.env.OIDC_ISSUER) {
    throw new Error('OIDC_ISSUER environment variable is missing');
  }

  const issuer = await Issuer.discover(process.env.OIDC_ISSUER);

  return new issuer.Client({
    client_id: process.env.OIDC_CLIENT_ID || 'client-id',
    client_secret: process.env.OIDC_CLIENT_SECRET || 'client-secret',
    redirect_uris: [process.env.OIDC_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'],
    response_types: ['code'],
  });
}

/**
 * Maps an email domain to a tenant/organization ID.
 */
export function mapDomainToOrg(email: string): string {
  const domain = email.split('@')[1];
  const domainMap: Record<string, string> = {
    'acme.com': 'org-acme-prod',
    'globex.co': 'org-globex-dev',
  };

  return domainMap[domain] || 'personal-workspace';
}

