import { createHash, randomBytes } from 'node:crypto'
import { nanoid } from 'nanoid'
import { config } from '../config.js'
import { connectOAuth, getUser, userFromToken } from './users.js'
// getUser/userFromToken are async
import type { OAuthProvider } from '../types.js'

interface OAuthState {
  id: string
  userId?: string
  provider: OAuthProvider
  codeVerifier: string
  createdAt: number
}

const states = new Map<string, OAuthState>()
const STATE_TTL_MS = 15 * 60 * 1000

function pruneStates() {
  const now = Date.now()
  for (const [k, v] of states) {
    if (now - v.createdAt > STATE_TTL_MS) states.delete(k)
  }
}

function base64Url(buf: Buffer) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function createPkce() {
  const codeVerifier = base64Url(randomBytes(32))
  const challenge = base64Url(createHash('sha256').update(codeVerifier).digest())
  return { codeVerifier, codeChallenge: challenge }
}

export function createOAuthState(userId: string | undefined, provider: OAuthProvider, codeVerifier: string) {
  pruneStates()
  const id = nanoid(24)
  states.set(id, { id, userId, provider, codeVerifier, createdAt: Date.now() })
  return id
}

export function takeOAuthState(stateId: string): OAuthState | null {
  pruneStates()
  const s = states.get(stateId)
  if (!s) return null
  states.delete(stateId)
  return s
}

export async function resolveUserFromOAuthStart(
  authHeader: string | undefined,
  queryToken: string | undefined,
) {
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken || null
  return userFromToken(token)
}

export function githubAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.github.redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'true',
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export function twitterAuthUrl(state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.twitter.clientId,
    redirect_uri: config.twitter.redirectUri,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://twitter.com/i/oauth2/authorize?${params}`
}

export async function exchangeGithubCode(code: string) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
      redirect_uri: config.github.redirectUri,
    }),
  })
  const data = (await res.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'GitHub token exchange failed')
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${data.access_token}`,
      'User-Agent': 'NimGigs',
    },
  })
  if (!userRes.ok) throw new Error('Failed to fetch GitHub profile')
  const profile = (await userRes.json()) as { id: number; login: string }
  return {
    providerUserId: String(profile.id),
    username: profile.login,
  }
}

export async function exchangeTwitterCode(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.twitter.redirectUri,
    code_verifier: codeVerifier,
    client_id: config.twitter.clientId,
  })

  const basic = Buffer.from(
    `${config.twitter.clientId}:${config.twitter.clientSecret}`,
  ).toString('base64')

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body,
  })
  const data = (await res.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || 'Twitter token exchange failed')
  }

  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
    },
  })
  if (!userRes.ok) throw new Error('Failed to fetch Twitter profile')
  const profile = (await userRes.json()) as {
    data?: { id: string; username: string; name?: string }
  }
  if (!profile.data?.id || !profile.data.username) {
    throw new Error('Twitter profile incomplete')
  }
  return {
    providerUserId: profile.data.id,
    username: profile.data.username,
  }
}

export async function linkOAuthAccount(
  userId: string,
  provider: OAuthProvider,
  username: string,
  providerUserId: string,
) {
  const user = await getUser(userId)
  if (!user) throw new Error('USER_NOT_FOUND')
  return connectOAuth(user, provider, username, providerUserId)
}

export function oauthFrontendRedirect(params: {
  ok: boolean
  provider: string
  error?: string
  username?: string
}) {
  const url = new URL('/profile', config.appUrl)
  url.searchParams.set('oauth', params.provider)
  url.searchParams.set('ok', params.ok ? '1' : '0')
  if (params.username) url.searchParams.set('username', params.username)
  if (params.error) url.searchParams.set('error', params.error)
  return url.toString()
}
