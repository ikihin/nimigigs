import type { Listing, PublicUser, Submission } from './types'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

type ErrorBody = { error?: { code?: string; message?: string } }

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = (await res.json().catch(() => ({}))) as T & ErrorBody
  if (!res.ok) {
    const msg = data.error?.message || data.error?.code || res.statusText
    throw new Error(msg)
  }
  return data
}

export const api = {
  signup(body: {
    email: string
    password: string
    displayName?: string
    referralCode?: string
  }) {
    return request<{ token: string; user: PublicUser }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  login(body: { email: string; password: string }) {
    return request<{ token: string; user: PublicUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
  me(token: string) {
    return request<{ user: PublicUser }>('/auth/me', { token })
  },
  patchMe(token: string, body: { displayName?: string; defaultRole?: 'freelance' | 'sponsor' }) {
    return request<{ user: PublicUser }>('/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(body),
    })
  },
  setWallet(token: string, address: string) {
    return request<{ user: PublicUser }>('/me/wallet', {
      method: 'POST',
      token,
      body: JSON.stringify({ address }),
    })
  },
  credits(token: string) {
    return request<{
      balance: number
      month: string
      referralCreditsMonth: number
      referralCap: number
      referralInvitesMonth: number
      invitesUntilNextCredit: number | null
      ledger: unknown[]
    }>('/me/credits', { token })
  },
  referral(token: string) {
    return request<{
      code: string
      link: string
      invitesMonth: number
      creditsFromReferralMonth: number
      cap: number
    }>('/me/referral', { token })
  },
  listings(params?: { type?: string; q?: string }, token?: string | null) {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.q) qs.set('q', params.q)
    const q = qs.toString()
    return request<{ listings: Listing[] }>(`/listings${q ? `?${q}` : ''}`, { token })
  },
  listing(id: string, token?: string | null) {
    return request<{ listing: Listing }>(`/listings/${id}`, { token })
  },
  submit(token: string, listingId: string, body: { workUrl: string; notes?: string }) {
    return request<{ submission: Submission; user: PublicUser }>(
      `/listings/${listingId}/submissions`,
      { method: 'POST', token, body: JSON.stringify(body) },
    )
  },
  mySubmissions(token: string) {
    return request<{ submissions: Submission[] }>('/me/submissions', { token })
  },
  myListings(token: string) {
    return request<{ listings: Listing[] }>('/me/listings', { token })
  },
  createListing(token: string, body: unknown) {
    return request<{ listing: Listing }>('/listings', {
      method: 'POST',
      token,
      body: JSON.stringify(body),
    })
  },
  lockListing(token: string, id: string, escrowTxHash?: string) {
    return request<{ listing: Listing }>(`/listings/${id}/lock`, {
      method: 'POST',
      token,
      body: JSON.stringify({ escrowTxHash }),
    })
  },
  listingSubmissions(token: string, id: string) {
    return request<{ submissions: Submission[] }>(`/listings/${id}/submissions`, { token })
  },
  setWinners(token: string, id: string, winners: { submissionId: string; rank: 1 | 2 | 3 }[]) {
    return request<{ listing: Listing }>(`/listings/${id}/winners`, {
      method: 'POST',
      token,
      body: JSON.stringify({ winners }),
    })
  },
  release(token: string, id: string) {
    return request<{ listing: Listing; payouts: unknown[] }>(`/listings/${id}/release`, {
      method: 'POST',
      token,
    })
  },
  connectOAuth(token: string, provider: 'twitter' | 'github', username: string) {
    return request<{ user: PublicUser }>(`/oauth/${provider}/connect`, {
      method: 'POST',
      token,
      body: JSON.stringify({ username }),
    })
  },
}
