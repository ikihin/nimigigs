import { nanoid } from 'nanoid'
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
import { getOAuth, getUser } from './users.js'
import {
  findListing,
  findSubmission,
  hasUserSubmitted,
  listListingsBySponsor,
  listOpenListings,
  listSubmissionsByUser,
  listSubmissionsForListing,
  saveListing,
  savePayout,
  saveSubmission,
} from '../db/repo.js'

export async function listOpen(filters?: {
  type?: ListingType
  category?: string
  q?: string
}): Promise<Listing[]> {
  return listOpenListings(filters)
}

export async function getListing(id: string) {
  return findListing(id)
}

export async function submissionsForListing(listingId: string) {
  return listSubmissionsForListing(listingId)
}

export async function userHasSubmitted(listingId: string, userId: string) {
  return hasUserSubmitted(listingId, userId)
}

export async function createListing(
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
): Promise<Listing> {
  const now = new Date().toISOString()
  const escrowAmount = input.rewards.reduce((sum, r) => sum + Number(r.amount), 0)
  if (escrowAmount <= 0) throw new Error('INVALID_REWARDS')

  const listing: Listing = {
    id: nanoid(),
    sponsorId: sponsor.id,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim() || input.type,
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
  await saveListing(listing)
  return listing
}

export async function lockListing(
  listing: Listing,
  sponsorId: string,
  txHash: string,
): Promise<Listing> {
  if (listing.sponsorId !== sponsorId) throw new Error('FORBIDDEN')
  if (listing.status !== 'pending_lock' && listing.status !== 'draft') {
    throw new Error('INVALID_STATUS')
  }
  listing.escrowTxHash = txHash
  listing.escrowStatus = 'locked'
  listing.status = 'open'
  listing.publishedAt = new Date().toISOString()
  listing.updatedAt = listing.publishedAt
  await saveListing(listing)
  return listing
}

export async function submitWork(
  listing: Listing,
  user: User,
  input: { workUrl: string; notes?: string },
): Promise<Submission> {
  if (listing.status !== 'open') throw new Error('LISTING_CLOSED')
  if (new Date(listing.deadlineAt).getTime() < Date.now()) throw new Error('LISTING_CLOSED')
  if (await hasUserSubmitted(listing.id, user.id)) throw new Error('ALREADY_SUBMITTED')
  if (!user.nimiqAddress) throw new Error('WALLET_REQUIRED')

  const twitter = await getOAuth(user.id, 'twitter')
  const github = await getOAuth(user.id, 'github')
  if (listing.requireTwitter && !twitter) throw new Error('TWITTER_REQUIRED')
  if (listing.requireGithub && !github) throw new Error('GITHUB_REQUIRED')

  try {
    const u = new URL(input.workUrl)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad')
  } catch {
    throw new Error('INVALID_URL')
  }

  const id = nanoid()
  await spendSubmit(user, id)

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
  await saveSubmission(sub)
  return sub
}

export async function setWinners(
  listing: Listing,
  sponsorId: string,
  winners: { submissionId: string; rank: 1 | 2 | 3 }[],
): Promise<Listing> {
  if (listing.sponsorId !== sponsorId) throw new Error('FORBIDDEN')
  if (listing.status !== 'open' && listing.status !== 'closed') throw new Error('INVALID_STATUS')

  const ranks = winners.map((w) => w.rank)
  if (new Set(ranks).size !== ranks.length) throw new Error('DUPLICATE_RANK')

  for (const w of winners) {
    const sub = await findSubmission(w.submissionId)
    if (!sub || sub.listingId !== listing.id) throw new Error('INVALID_SUBMISSION')
    sub.status = 'winner'
    sub.rank = w.rank
    await saveSubmission(sub)
  }

  listing.status = 'closed'
  listing.updatedAt = new Date().toISOString()
  await saveListing(listing)
  return listing
}

export async function releasePayouts(
  listing: Listing,
  sponsorId: string,
  demoTxPrefix = 'demo_tx_',
): Promise<{ listing: Listing; payouts: ReturnType<typeof buildPayouts> }> {
  if (listing.sponsorId !== sponsorId) throw new Error('FORBIDDEN')
  if (listing.escrowStatus !== 'locked') throw new Error('ESCROW_NOT_LOCKED')

  const winners = (await listSubmissionsForListing(listing.id)).filter(
    (s) => s.status === 'winner' && s.rank,
  )
  if (winners.length === 0) throw new Error('NO_WINNERS')

  const payouts = buildPayouts(listing, winners, demoTxPrefix)
  for (const p of payouts) await savePayout(p)

  for (const w of winners) {
    const u = await getUser(w.userId)
    if (u) await awardWin(u, w.id)
  }

  listing.escrowStatus = 'released'
  listing.status = 'paid'
  listing.updatedAt = new Date().toISOString()
  await saveListing(listing)
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

export async function listingsBySponsor(sponsorId: string) {
  return listListingsBySponsor(sponsorId)
}

export async function submissionsByUser(userId: string) {
  return listSubmissionsByUser(userId)
}
