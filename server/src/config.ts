function env(key: string, fallback = '') {
  return (process.env[key] ?? fallback).trim()
}

const apiPublicUrl = env('API_PUBLIC_URL', 'http://localhost:8787')
const appUrl = env('APP_URL', 'http://localhost:5173')

export const config = {
  port: Number(process.env.PORT || 8787),
  appUrl,
  apiPublicUrl,
  /** Allow paste-handle fallback when real OAuth env is missing */
  oauthAllowStub: env('OAUTH_ALLOW_STUB', 'true') === 'true',
  supabase: {
    url: env('SUPABASE_URL'),
    /** Server-only key — never expose to the browser */
    serviceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
    enabled() {
      return Boolean(this.url && this.serviceRoleKey)
    },
  },
  github: {
    clientId: env('GITHUB_CLIENT_ID'),
    clientSecret: env('GITHUB_CLIENT_SECRET'),
    redirectUri: env('GITHUB_REDIRECT_URI', `${apiPublicUrl}/api/v1/oauth/github/callback`),
    enabled() {
      return Boolean(this.clientId && this.clientSecret)
    },
  },
  twitter: {
    clientId: env('TWITTER_CLIENT_ID'),
    clientSecret: env('TWITTER_CLIENT_SECRET'),
    redirectUri: env('TWITTER_REDIRECT_URI', `${apiPublicUrl}/api/v1/oauth/twitter/callback`),
    enabled() {
      return Boolean(this.clientId && this.clientSecret)
    },
  },
}
