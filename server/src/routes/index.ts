import { Hono } from 'hono'
import type { AppEnv } from '../middleware/auth.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import {
  authenticate,
  connectOAuth,
  createSession,
  createUser,
  setWallet,
  toPublicUser,
  updateProfile,
  getUser,
} from '../services/users.js'
import { ledgerForUser, REFERRAL_CAP_PER_MONTH, REFERRAL_PAIR } from '../services/credits.js'
import {
  createListing,
  getListing,
  listOpen,
  listingsBySponsor,
  lockListing,
  releasePayouts,
  setWinners,
  submissionsByUser,
  submissionsForListing,
  submitWork,
  userHasSubmitted,
} from '../services/listings.js'
import { store } from '../db/store.js'
import { config } from '../config.js'
import {
  createOAuthState,
  createPkce,
  exchangeGithubCode,
  exchangeTwitterCode,
  githubAuthUrl,
  linkOAuthAccount,
  oauthFrontendRedirect,
  resolveUserFromOAuthStart,
  takeOAuthState,
  twitterAuthUrl,
} from '../services/oauth.js'

export const api = new Hono<AppEnv>()

function err(
  c: { json: (body: unknown, status?: number) => Response },
  code: string,
  message: string,
  status: number,
) {
  return c.json({ error: { code, message } }, status)
}

function listingId(c: { req: { param: (k: string) => string | undefined } }) {
  return c.req.param('id') ?? ''
}

// ── Auth ──────────────────────────────────────────────
api.post('/auth/signup', async (c) => {
  const body = await c.req.json<{
    email: string
    password: string
    displayName?: string
    referralCode?: string
  }>()
  try {
    if (!body.email || !body.password || body.password.length < 6) {
      return err(c, 'INVALID_INPUT', 'Email and password (min 6) required', 400)
    }
    const user = await createUser(body)
    const token = createSession(user.id)
    return c.json({ token, user: toPublicUser(user) }, 201)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR'
    if (code === 'EMAIL_TAKEN') return err(c, code, 'Email already registered', 409)
    if (code === 'INVALID_REFERRAL') return err(c, code, 'Referral code not found', 400)
    return err(c, 'ERROR', 'Signup failed', 500)
  }
})

api.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>()
  const user = await authenticate(body.email || '', body.password || '')
  if (!user) return err(c, 'INVALID_CREDENTIALS', 'Invalid email or password', 401)
  const token = createSession(user.id)
  return c.json({ token, user: toPublicUser(user) })
})

api.get('/auth/me', requireAuth, (c) => {
  return c.json({ user: toPublicUser(c.get('user')) })
})

// ── Me ────────────────────────────────────────────────
api.patch('/me', requireAuth, async (c) => {
  const body = await c.req.json<{ displayName?: string; defaultRole?: 'freelance' | 'sponsor' }>()
  const user = updateProfile(c.get('user'), body)
  return c.json({ user: toPublicUser(user) })
})

api.post('/me/wallet', requireAuth, async (c) => {
  const body = await c.req.json<{
    address: string
    signature?: string
    message?: string
    publicKey?: string
    method?: string
  }>()
  if (!body.address?.trim()) return err(c, 'INVALID_INPUT', 'Address required', 400)
  // Prefer signed proof from Hub (hub.nimiq.com/sign-message) or Mini App provider.sign()
  // Full cryptographic verify can use @nimiq/core against MSG_PREFIX hash in production.
  if (!body.signature || !body.message) {
    return err(
      c,
      'SIGNATURE_REQUIRED',
      'Sign a message with your Nimiq wallet (Hub or Nimiq Pay) to connect',
      400,
    )
  }
  if (!body.message.includes('NimGigs wallet connect')) {
    return err(c, 'INVALID_MESSAGE', 'Unexpected sign message challenge', 400)
  }
  const user = setWallet(c.get('user'), body.address, {
    message: body.message,
    signature: body.signature,
    publicKey: body.publicKey,
    method: body.method,
  })
  return c.json({
    user: toPublicUser(user),
    proof: {
      method: body.method,
      address: body.address,
      hasSignature: true,
    },
  })
})

api.get('/me/credits', requireAuth, (c) => {
  const user = c.get('user')
  const nextCreditAt =
    user.referralInvitesMonth % REFERRAL_PAIR === 0
      ? REFERRAL_PAIR
      : REFERRAL_PAIR - (user.referralInvitesMonth % REFERRAL_PAIR)
  return c.json({
    balance: user.creditsBalance,
    month: user.creditsMonth,
    referralCreditsMonth: user.referralCreditsMonth,
    referralCap: REFERRAL_CAP_PER_MONTH,
    referralInvitesMonth: user.referralInvitesMonth,
    invitesUntilNextCredit: user.referralCreditsMonth >= REFERRAL_CAP_PER_MONTH ? null : nextCreditAt,
    ledger: ledgerForUser(user.id),
  })
})

api.get('/me/referral', requireAuth, (c) => {
  const user = c.get('user')
  return c.json({
    code: user.referralCode,
    link: `/signup?ref=${user.referralCode}`,
    invitesMonth: user.referralInvitesMonth,
    creditsFromReferralMonth: user.referralCreditsMonth,
    cap: REFERRAL_CAP_PER_MONTH,
  })
})

api.get('/me/submissions', requireAuth, (c) => {
  const subs = submissionsByUser(c.get('user').id).map((s) => ({
    ...s,
    listing: getListing(s.listingId),
  }))
  return c.json({ submissions: subs })
})

api.get('/me/listings', requireAuth, (c) => {
  return c.json({ listings: listingsBySponsor(c.get('user').id) })
})

api.get('/me/payouts', requireAuth, (c) => {
  const userId = c.get('user').id
  const payouts = [...store.payouts.values()].filter((p) => p.userId === userId)
  return c.json({ payouts })
})

// ── OAuth (GitHub + Twitter/X) ────────────────────────
api.get('/oauth/status', (c) => {
  return c.json({
    github: config.github.enabled(),
    twitter: config.twitter.enabled(),
    allowStub: config.oauthAllowStub,
  })
})

/** Start OAuth — pass Bearer token or ?token=JWT (for full-page redirect) */
api.get('/oauth/:provider/start', async (c) => {
  const provider = c.req.param('provider')
  if (provider !== 'twitter' && provider !== 'github') {
    return err(c, 'INVALID_PROVIDER', 'Use twitter or github', 400)
  }
  const user = resolveUserFromOAuthStart(
    c.req.header('authorization'),
    c.req.query('token'),
  )
  if (!user) return err(c, 'UNAUTHORIZED', 'Login required', 401)

  if (provider === 'github') {
    if (!config.github.enabled()) {
      return err(
        c,
        'OAUTH_NOT_CONFIGURED',
        'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on the server',
        503,
      )
    }
    const { codeVerifier, codeChallenge } = createPkce()
    const state = createOAuthState(user.id, 'github', codeVerifier)
    // codeChallenge unused for GitHub (no PKCE required) but state stores verifier anyway
    void codeChallenge
    const url = githubAuthUrl(state)
    if (c.req.query('redirect') === '1') return c.redirect(url)
    return c.json({ url, provider: 'github' })
  }

  // twitter / X OAuth 2.0 + PKCE
  if (!config.twitter.enabled()) {
    return err(
      c,
      'OAUTH_NOT_CONFIGURED',
      'Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET on the server',
      503,
    )
  }
  const { codeVerifier, codeChallenge } = createPkce()
  const state = createOAuthState(user.id, 'twitter', codeVerifier)
  const url = twitterAuthUrl(state, codeChallenge)
  if (c.req.query('redirect') === '1') return c.redirect(url)
  return c.json({ url, provider: 'twitter' })
})

api.get('/oauth/github/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const oauthError = c.req.query('error')
  if (oauthError) {
    return c.redirect(oauthFrontendRedirect({ ok: false, provider: 'github', error: oauthError }))
  }
  if (!code || !state) {
    return c.redirect(
      oauthFrontendRedirect({ ok: false, provider: 'github', error: 'missing_code' }),
    )
  }
  const st = takeOAuthState(state)
  if (!st || st.provider !== 'github') {
    return c.redirect(
      oauthFrontendRedirect({ ok: false, provider: 'github', error: 'invalid_state' }),
    )
  }
  try {
    const profile = await exchangeGithubCode(code)
    linkOAuthAccount(st.userId, 'github', profile.username, profile.providerUserId)
    return c.redirect(
      oauthFrontendRedirect({ ok: true, provider: 'github', username: profile.username }),
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'github_failed'
    return c.redirect(oauthFrontendRedirect({ ok: false, provider: 'github', error: message }))
  }
})

api.get('/oauth/twitter/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const oauthError = c.req.query('error')
  if (oauthError) {
    return c.redirect(oauthFrontendRedirect({ ok: false, provider: 'twitter', error: oauthError }))
  }
  if (!code || !state) {
    return c.redirect(
      oauthFrontendRedirect({ ok: false, provider: 'twitter', error: 'missing_code' }),
    )
  }
  const st = takeOAuthState(state)
  if (!st || st.provider !== 'twitter') {
    return c.redirect(
      oauthFrontendRedirect({ ok: false, provider: 'twitter', error: 'invalid_state' }),
    )
  }
  try {
    const profile = await exchangeTwitterCode(code, st.codeVerifier)
    linkOAuthAccount(st.userId, 'twitter', profile.username, profile.providerUserId)
    return c.redirect(
      oauthFrontendRedirect({ ok: true, provider: 'twitter', username: profile.username }),
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'twitter_failed'
    return c.redirect(oauthFrontendRedirect({ ok: false, provider: 'twitter', error: message }))
  }
})

/** Fallback: paste handle (only if OAUTH_ALLOW_STUB=true or OAuth not configured) */
api.post('/oauth/:provider/connect', requireAuth, async (c) => {
  const provider = c.req.param('provider')
  if (provider !== 'twitter' && provider !== 'github') {
    return err(c, 'INVALID_PROVIDER', 'Use twitter or github', 400)
  }
  const configured =
    provider === 'github' ? config.github.enabled() : config.twitter.enabled()
  if (configured && !config.oauthAllowStub) {
    return err(
      c,
      'USE_OAUTH_FLOW',
      `Use GET /oauth/${provider}/start for real OAuth`,
      400,
    )
  }
  const body = await c.req.json<{ username: string }>()
  if (!body.username?.trim()) return err(c, 'INVALID_INPUT', 'username required', 400)
  const account = connectOAuth(c.get('user'), provider, body.username)
  return c.json({ account, user: toPublicUser(c.get('user')), stub: true })
})

api.delete('/oauth/:provider', requireAuth, async (c) => {
  const provider = c.req.param('provider')
  if (provider !== 'twitter' && provider !== 'github') {
    return err(c, 'INVALID_PROVIDER', 'Use twitter or github', 400)
  }
  store.oauth.delete(`${c.get('user').id}:${provider}`)
  return c.json({ ok: true, user: toPublicUser(c.get('user')) })
})

// ── Listings ──────────────────────────────────────────
api.get('/listings', (c) => {
  const type = c.req.query('type') as 'bounty' | 'quest' | 'job' | undefined
  const category = c.req.query('category') || undefined
  const q = c.req.query('q') || undefined
  const user = optionalAuth(c)
  const listings = listOpen({ type, category, q }).map((l) => ({
    ...l,
    submitCount: submissionsForListing(l.id).length,
    hasSubmitted: user ? userHasSubmitted(l.id, user.id) : false,
  }))
  return c.json({ listings })
})

api.get('/listings/:id', (c) => {
  const listing = getListing(listingId(c))
  if (!listing) return err(c, 'NOT_FOUND', 'Listing not found', 404)
  const user = optionalAuth(c)
  return c.json({
    listing: {
      ...listing,
      submitCount: submissionsForListing(listing.id).length,
      hasSubmitted: user ? userHasSubmitted(listing.id, user.id) : false,
    },
  })
})

api.post('/listings', requireAuth, async (c) => {
  const body = await c.req.json()
  try {
    const listing = createListing(c.get('user'), body)
    return c.json({ listing }, 201)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR'
    return err(c, code, 'Could not create listing', 400)
  }
})

api.post('/listings/:id/lock', requireAuth, async (c) => {
  const listing = getListing(listingId(c))
  if (!listing) return err(c, 'NOT_FOUND', 'Listing not found', 404)
  const body = await c.req.json<{ escrowTxHash: string }>()
  try {
    const updated = lockListing(
      listing,
      c.get('user').id,
      body.escrowTxHash || `demo_lock_${Date.now()}`,
    )
    return c.json({ listing: updated })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR'
    return err(c, code, code, 400)
  }
})

api.post('/listings/:id/submissions', requireAuth, async (c) => {
  const listing = getListing(listingId(c))
  if (!listing) return err(c, 'NOT_FOUND', 'Listing not found', 404)
  const body = await c.req.json<{ workUrl: string; notes?: string }>()
  try {
    const submission = submitWork(listing, c.get('user'), body)
    return c.json({ submission, user: toPublicUser(c.get('user')) }, 201)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR'
    const messages: Record<string, string> = {
      CREDITS_EMPTY: 'Not enough credits',
      LISTING_CLOSED: 'Listing is closed',
      ALREADY_SUBMITTED: 'You already submitted',
      WALLET_REQUIRED: 'Connect Nimiq wallet first',
      TWITTER_REQUIRED: 'Connect Twitter first',
      GITHUB_REQUIRED: 'Connect GitHub first',
      INVALID_URL: 'Work link must be http(s)',
    }
    return err(c, code, messages[code] || code, 400)
  }
})

api.get('/listings/:id/submissions', requireAuth, (c) => {
  const listing = getListing(listingId(c))
  if (!listing) return err(c, 'NOT_FOUND', 'Listing not found', 404)
  if (listing.sponsorId !== c.get('user').id) {
    return err(c, 'FORBIDDEN', 'Sponsor only', 403)
  }
  const submissions = submissionsForListing(listing.id).map((s) => ({
    ...s,
    user: (() => {
      const u = getUser(s.userId)
      return u
        ? { id: u.id, displayName: u.displayName, nimiqAddress: u.nimiqAddress }
        : null
    })(),
  }))
  return c.json({ submissions })
})

api.post('/listings/:id/winners', requireAuth, async (c) => {
  const listing = getListing(listingId(c))
  if (!listing) return err(c, 'NOT_FOUND', 'Listing not found', 404)
  const body = await c.req.json<{ winners: { submissionId: string; rank: 1 | 2 | 3 }[] }>()
  try {
    const updated = setWinners(listing, c.get('user').id, body.winners || [])
    return c.json({ listing: updated })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR'
    return err(c, code, code, 400)
  }
})

api.post('/listings/:id/release', requireAuth, async (c) => {
  const listing = getListing(listingId(c))
  if (!listing) return err(c, 'NOT_FOUND', 'Listing not found', 404)
  try {
    const result = releasePayouts(listing, c.get('user').id)
    return c.json(result)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR'
    return err(c, code, code, 400)
  }
})

api.get('/health', (c) => c.json({ ok: true, service: 'nimigigs-api' }))
