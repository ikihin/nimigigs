import { nanoid } from 'nanoid'
import { store } from '../db/store.js'
import type {
  Currency,
  Listing,
  ListingCurrency,
  ListingReward,
  ListingType,
  Submission,
  User,
  WinnerMode,
} from '../types.js'
import { awardWin, spendSubmit } from './credits.js'
import { getOAuth } from './users.js'

export function listOpen(filters?: {
  type?: ListingType
  category?: string
  q?: string
}): Listing[] {
  let items = [...store.listings.values()].filter((l) => l.status === 'open')
  if (filters?.type) items = items.filter((l) => l.type === filters.type)
  if (filters?.category) items = items.filter((l) => l.category === filters.category)
  if (filters?.q) {
    const q = filters.q.toLowerCase()
    items = items.filter(
      (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
    )
  }
  return items.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
}

export function getListing(id: string) {
  return store.listings.get(id) ?? null
}

export function submissionsForListing(listingId: string) {
  return [...store.submissions.values()]
    .filter((s) => s.listingId === listingId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function userHasSubmitted(listingId: string, userId: string) {
  return [...store.submissions.values()].some((s) => s.listingId === listingId && s.userId === userId)
}

export function createListing(
  sponsor: User,
  input: {
    type: ListingType
    title: string
    description: string
    category: string
    deadlineAt: string
    currency: ListingCurrency
    winnerMode: WinnerMode
    requireLink?: boolean
    requireTwitter?: boolean
    requireGithub?: boolean
    rewards: ListingReward[]
  },
): Listing {
  const now = new Date().toISOString()
  const escrowAmount = input.rewards.reduce((sum, r) => sum + Number(r.amount), 0)
  if (escrowAmount <= 0) throw new Error('INVALID_REWARDS')

  if (input.winnerMode === 'single' && input.rewards.filter((r) => r.amount > 0).length !== 1) {
    // allow only rank 1
  }

  const listing: Listing = {
    id: nanoid(),
    sponsorId: sponsor.id,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim() || 'other',
    status: 'pending_lock',
    currency: input.currency,
    winnerMode: input.winnerMode,
    requireLink: input.requireLink ?? true,
    requireTwitter: input.requireTwitter ?? false,
    requireGithub: input.requireGithub ?? false,
    deadlineAt: input.deadlineAt,
    escrowTxHash: null,
    escrowAmount,
    escrowStatus: 'none',
    rewards: input.rewards.map((r) => ({
      rank: r.rank,
      amount: Number(r.amount),
      currency: r.currency,
    })),
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  store.listings.set(listing.id, listing)
  return listing
}

export function lockListing(listing: Listing, sponsorId: string, txHash: string): Listing {
  if (listing.sponsorId !== sponsorId) throw new Error('FORBIDDEN')
  if (listing.status !== 'pending_lock' && listing.status !== 'draft') {
    throw new Error('INVALID_STATUS')
  }
  listing.escrowTxHash = txHash
  listing.escrowStatus = 'locked'
  listing.status = 'open'
  listing.publishedAt = new Date().toISOString()
  listing.updatedAt = listing.publishedAt
  store.listings.set(listing.id, listing)
  return listing
}

export function submitWork(
  listing: Listing,
  user: User,
  input: { workUrl: string; notes?: string },
): Submission {
  if (listing.status !== 'open') throw new Error('LISTING_CLOSED')
  if (new Date(listing.deadlineAt).getTime() < Date.now()) throw new Error('LISTING_CLOSED')
  if (userHasSubmitted(listing.id, user.id)) throw new Error('ALREADY_SUBMITTED')
  if (!user.nimiqAddress) throw new Error('WALLET_REQUIRED')

  const twitter = getOAuth(user.id, 'twitter')
  const github = getOAuth(user.id, 'github')
  if (listing.requireTwitter && !twitter) throw new Error('TWITTER_REQUIRED')
  if (listing.requireGithub && !github) throw new Error('GITHUB_REQUIRED')

  try {
    const u = new URL(input.workUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad')
  } catch {
    throw new Error('INVALID_URL')
  }

  const id = nanoid()
  // spend credit first (throws CREDITS_EMPTY)
  spendSubmit(user, id)

  const sub: Submission = {
    id,
    listingId: listing.id,
    userId: user.id,
    workUrl: input.workUrl.trim(),
    notes: input.notes?.trim() || null,
    walletAddress: user.nimiqAddress,
    twitterUsername: twitter?.username ?? null,
    githubUsername: github?.username ?? null,
    status: 'submitted',
    rank: null,
    creditSpent: 1,
    createdAt: new Date().toISOString(),
  }
  store.submissions.set(id, sub)
  return sub
}

export function setWinners(
  listing: Listing,
  sponsorId: string,
  winners: { submissionId: string; rank: 1 | 2 | 3 }[],
): Listing {
  if (listing.sponsorId !== sponsorId) throw new Error('FORBIDDEN')
  if (listing.status !== 'open' && listing.status !== 'closed') throw new Error('INVALID_STATUS')

  const ranks = winners.map((w) => w.rank)
  if (new Set(ranks).size !== ranks.length) throw new Error('DUPLICATE_RANK')

  for (const w of winners) {
    const sub = store.submissions.get(w.submissionId)
    if (!sub || sub.listingId !== listing.id) throw new Error('INVALID_SUBMISSION')
    sub.status = 'winner'
    sub.rank = w.rank
    store.submissions.set(sub.id, sub)
  }

  listing.status = 'closed'
  listing.updatedAt = new Date().toISOString()
  store.listings.set(listing.id, listing)
  return listing
}

export function releasePayouts(listing: Listing, sponsorId: string, demoTxPrefix = 'demo_tx_'): {
  listing: Listing
  payouts: ReturnType<typeof buildPayouts>
} {
  if (listing.sponsorId !== sponsorId) throw new Error('FORBIDDEN')
  if (listing.escrowStatus !== 'locked') throw new Error('ESCROW_NOT_LOCKED')

  const winners = submissionsForListing(listing.id).filter((s) => s.status === 'winner' && s.rank)
  if (winners.length === 0) throw new Error('NO_WINNERS')

  const payouts = buildPayouts(listing, winners, demoTxPrefix)
  for (const p of payouts) store.payouts.set(p.id, p)

  for (const w of winners) {
    const u = store.users.get(w.userId)
    if (u) awardWin(u, w.id)
  }

  listing.escrowStatus = 'released'
  listing.status = 'paid'
  listing.updatedAt = new Date().toISOString()
  store.listings.set(listing.id, listing)
  return { listing, payouts }
}

function buildPayouts(listing: Listing, winners: Submission[], demoTxPrefix: string) {
  const now = new Date().toISOString()
  return winners.map((w) => {
    const reward = listing.rewards.find((r) => r.rank === w.rank)
    const amount = reward?.amount ?? 0
    const currency = (reward?.currency ?? 'USDT') as Currency
    return {
      id: nanoid(),
      listingId: listing.id,
      submissionId: w.id,
      userId: w.userId,
      rank: w.rank as 1 | 2 | 3,
      amount,
      currency,
      txHash: `${demoTxPrefix}${nanoid(8)}`,
      status: 'sent' as const,
      createdAt: now,
    }
  })
}

export function listingsBySponsor(sponsorId: string) {
  return [...store.listings.values()]
    .filter((l) => l.sponsorId === sponsorId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function submissionsByUser(userId: string) {
  return [...store.submissions.values()]
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
