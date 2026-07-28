/**
 * Dual-mode persistence: Supabase when configured, else in-memory store.
 */
import { nanoid } from 'nanoid'
import { store } from './store.js'
import { getSupabase, useSupabase } from './supabase.js'
import {
  listingToRow,
  payoutToRow,
  referralToRow,
  rowToLedger,
  rowToListing,
  rowToOAuth,
  rowToPayout,
  rowToReferral,
  rowToSubmission,
  rowToUser,
  submissionToRow,
  userToRow,
} from './mappers.js'
import type {
  CreditLedgerEntry,
  CreditReason,
  Listing,
  ListingType,
  OAuthAccount,
  OAuthProvider,
  Payout,
  Referral,
  Submission,
  User,
} from '../types.js'

function sb() {
  return getSupabase()
}

// ── Users ─────────────────────────────────────────────
export async function saveUser(user: User): Promise<void> {
  if (!useSupabase()) {
    store.users.set(user.id, user)
    store.usersByEmail.set(user.email, user.id)
    store.usersByReferral.set(user.referralCode, user.id)
    return
  }
  const { error } = await sb().from('users').upsert(userToRow(user))
  if (error) throw new Error(error.message)
}

export async function findUserById(id: string): Promise<User | null> {
  if (!useSupabase()) return store.users.get(id) ?? null
  const { data, error } = await sb().from('users').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToUser(data) : null
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const e = email.trim().toLowerCase()
  if (!useSupabase()) {
    const id = store.usersByEmail.get(e)
    return id ? (store.users.get(id) ?? null) : null
  }
  const { data, error } = await sb().from('users').select('*').eq('email', e).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToUser(data) : null
}

export async function findUserByWalletAddress(address: string): Promise<User | null> {
  const a = address.replace(/\s+/g, ' ').trim()
  if (!useSupabase()) {
    return [...store.users.values()].find((u) => u.nimiqAddress === a) ?? null
  }
  const { data, error } = await sb().from('users').select('*').eq('nimiq_address', a).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToUser(data) : null
}

export async function findUserIdByReferral(code: string): Promise<string | null> {
  const c = code.trim().toUpperCase()
  if (!useSupabase()) return store.usersByReferral.get(c) ?? null
  const { data, error } = await sb().from('users').select('id').eq('referral_code', c).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? String(data.id) : null
}

export async function referralCodeExists(code: string): Promise<boolean> {
  return Boolean(await findUserIdByReferral(code))
}

// ── Sessions ──────────────────────────────────────────
export async function createSessionToken(userId: string): Promise<string> {
  const token = nanoid(32)
  if (!useSupabase()) {
    store.sessions.set(token, userId)
    return token
  }
  const { error } = await sb().from('sessions').insert({ token, user_id: userId })
  if (error) throw new Error(error.message)
  return token
}

export async function findUserIdBySession(token: string): Promise<string | null> {
  if (!useSupabase()) return store.sessions.get(token) ?? null
  const { data, error } = await sb().from('sessions').select('user_id').eq('token', token).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? String(data.user_id) : null
}

// ── OAuth ─────────────────────────────────────────────
export async function saveOAuth(account: OAuthAccount): Promise<void> {
  if (!useSupabase()) {
    store.oauth.set(`${account.userId}:${account.provider}`, account)
    return
  }
  const { error } = await sb().from('oauth_accounts').upsert({
    id: account.id,
    user_id: account.userId,
    provider: account.provider,
    provider_user_id: account.providerUserId,
    username: account.username,
    connected_at: account.connectedAt,
  })
  if (error) throw new Error(error.message)
}

export async function getOAuthAccount(
  userId: string,
  provider: OAuthProvider,
): Promise<OAuthAccount | null> {
  if (!useSupabase()) return store.oauth.get(`${userId}:${provider}`) ?? null
  const { data, error } = await sb()
    .from('oauth_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToOAuth(data) : null
}

export async function getOAuthAccountByProvider(
  provider: OAuthProvider,
  providerUserId: string,
): Promise<OAuthAccount | null> {
  if (!useSupabase()) {
    return (
      [...store.oauth.values()].find(
        (a) => a.provider === provider && a.providerUserId === providerUserId,
      ) ?? null
    )
  }
  const { data, error } = await sb()
    .from('oauth_accounts')
    .select('*')
    .eq('provider', provider)
    .eq('provider_user_id', providerUserId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToOAuth(data) : null
}

export async function deleteOAuth(userId: string, provider: OAuthProvider): Promise<void> {
  if (!useSupabase()) {
    store.oauth.delete(`${userId}:${provider}`)
    return
  }
  const { error } = await sb()
    .from('oauth_accounts')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) throw new Error(error.message)
}

// ── Referrals ─────────────────────────────────────────
export async function saveReferral(ref: Referral): Promise<void> {
  if (!useSupabase()) {
    store.referrals.set(ref.id, ref)
    return
  }
  const { error } = await sb().from('referrals').upsert(referralToRow(ref))
  if (error) throw new Error(error.message)
}

export async function listReferralsByInvitee(inviteeId: string): Promise<Referral[]> {
  if (!useSupabase()) {
    return [...store.referrals.values()].filter((r) => r.inviteeId === inviteeId)
  }
  const { data, error } = await sb().from('referrals').select('*').eq('invitee_id', inviteeId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToReferral(r))
}

// ── Credits ───────────────────────────────────────────
export async function pushLedgerEntry(entry: CreditLedgerEntry): Promise<void> {
  if (!useSupabase()) {
    store.creditLedger.push(entry)
    return
  }
  const { error } = await sb().from('credit_ledger').insert({
    id: entry.id,
    user_id: entry.userId,
    delta: entry.delta,
    reason: entry.reason,
    ref_type: entry.refType,
    ref_id: entry.refId,
    month_key: entry.monthKey,
    created_at: entry.createdAt,
    meta: entry.meta ?? null,
  })
  if (error) throw new Error(error.message)
}

export async function listLedger(userId: string, limit = 50): Promise<CreditLedgerEntry[]> {
  if (!useSupabase()) {
    return store.creditLedger
      .filter((e) => e.userId === userId)
      .slice(-limit)
      .reverse()
  }
  const { data, error } = await sb()
    .from('credit_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToLedger(r))
}

// ── Listings ──────────────────────────────────────────
export async function saveListing(listing: Listing): Promise<void> {
  if (!useSupabase()) {
    store.listings.set(listing.id, listing)
    return
  }
  const { error } = await sb().from('listings').upsert(listingToRow(listing))
  if (error) throw new Error(error.message)
}

export async function findListing(id: string): Promise<Listing | null> {
  if (!useSupabase()) return store.listings.get(id) ?? null
  const { data, error } = await sb().from('listings').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToListing(data) : null
}

export async function listOpenListings(filters?: {
  type?: ListingType
  category?: string
  q?: string
}): Promise<Listing[]> {
  if (!useSupabase()) {
    let items = [...store.listings.values()].filter((l) => l.status === 'open')
    if (filters?.type) items = items.filter((l) => l.type === filters.type)
    if (filters?.category) items = items.filter((l) => l.category === filters.category)
    if (filters?.q) {
      const q = filters.q.toLowerCase()
      items = items.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
      )
    }
    return items.sort((a, b) =>
      (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt),
    )
  }
  let query = sb().from('listings').select('*').eq('status', 'open')
  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.q) query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToListing(r))
}

export async function listListingsBySponsor(sponsorId: string): Promise<Listing[]> {
  if (!useSupabase()) {
    return [...store.listings.values()]
      .filter((l) => l.sponsorId === sponsorId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const { data, error } = await sb()
    .from('listings')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToListing(r))
}

// ── Submissions ───────────────────────────────────────
export async function saveSubmission(sub: Submission): Promise<void> {
  if (!useSupabase()) {
    store.submissions.set(sub.id, sub)
    return
  }
  const { error } = await sb().from('submissions').upsert(submissionToRow(sub))
  if (error) throw new Error(error.message)
}

export async function listSubmissionsForListing(listingId: string): Promise<Submission[]> {
  if (!useSupabase()) {
    return [...store.submissions.values()]
      .filter((s) => s.listingId === listingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const { data, error } = await sb()
    .from('submissions')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToSubmission(r))
}

export async function listSubmissionsByUser(userId: string): Promise<Submission[]> {
  if (!useSupabase()) {
    return [...store.submissions.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const { data, error } = await sb()
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToSubmission(r))
}

export async function hasUserSubmitted(listingId: string, userId: string): Promise<boolean> {
  if (!useSupabase()) {
    return [...store.submissions.values()].some(
      (s) => s.listingId === listingId && s.userId === userId,
    )
  }
  const { data, error } = await sb()
    .from('submissions')
    .select('id')
    .eq('listing_id', listingId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function findSubmission(id: string): Promise<Submission | null> {
  if (!useSupabase()) return store.submissions.get(id) ?? null
  const { data, error } = await sb().from('submissions').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToSubmission(data) : null
}

// ── Payouts ───────────────────────────────────────────
export async function savePayout(p: Payout): Promise<void> {
  if (!useSupabase()) {
    store.payouts.set(p.id, p)
    return
  }
  const { error } = await sb().from('payouts').upsert(payoutToRow(p))
  if (error) throw new Error(error.message)
}

export async function listPayoutsByUser(userId: string): Promise<Payout[]> {
  if (!useSupabase()) {
    return [...store.payouts.values()].filter((p) => p.userId === userId)
  }
  const { data, error } = await sb().from('payouts').select('*').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => rowToPayout(r))
}

export async function countUsers(): Promise<number> {
  if (!useSupabase()) return store.users.size
  const { count, error } = await sb().from('users').select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

export function makeLedger(
  userId: string,
  delta: number,
  reason: CreditReason,
  monthKey: string,
  ref?: { refType?: string; refId?: string; meta?: Record<string, unknown> },
): CreditLedgerEntry {
  return {
    id: nanoid(),
    userId,
    delta,
    reason,
    refType: ref?.refType ?? null,
    refId: ref?.refId ?? null,
    monthKey,
    createdAt: new Date().toISOString(),
    meta: ref?.meta,
  }
}
