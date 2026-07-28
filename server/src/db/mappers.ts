import type {
  CreditLedgerEntry,
  Listing,
  OAuthAccount,
  Payout,
  Referral,
  Submission,
  User,
} from '../types.js'

// ── Users ─────────────────────────────────────────────
export function rowToUser(row: Record<string, unknown>): User {
  const proof = row.wallet_proof as User['walletProof'] | null
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    emailVerifiedAt: row.email_verified_at ? String(row.email_verified_at) : null,
    displayName: String(row.display_name),
    defaultRole: row.default_role as User['defaultRole'],
    nimiqAddress: row.nimiq_address ? String(row.nimiq_address) : null,
    walletProof: proof ?? null,
    referralCode: String(row.referral_code),
    referredByUserId: row.referred_by_user_id ? String(row.referred_by_user_id) : null,
    creditsBalance: Number(row.credits_balance),
    creditsMonth: String(row.credits_month).slice(0, 10),
    referralCreditsMonth: Number(row.referral_credits_month),
    referralInvitesMonth: Number(row.referral_invites_month),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function userToRow(user: User) {
  return {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash,
    email_verified_at: user.emailVerifiedAt,
    display_name: user.displayName,
    default_role: user.defaultRole,
    nimiq_address: user.nimiqAddress,
    wallet_proof: user.walletProof ?? null,
    referral_code: user.referralCode,
    referred_by_user_id: user.referredByUserId,
    credits_balance: user.creditsBalance,
    credits_month: user.creditsMonth,
    referral_credits_month: user.referralCreditsMonth,
    referral_invites_month: user.referralInvitesMonth,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  }
}

// ── OAuth ─────────────────────────────────────────────
export function rowToOAuth(row: Record<string, unknown>): OAuthAccount {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    provider: row.provider as OAuthAccount['provider'],
    providerUserId: String(row.provider_user_id),
    username: String(row.username),
    connectedAt: String(row.connected_at),
  }
}

// ── Listings ──────────────────────────────────────────
export function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: String(row.id),
    sponsorId: String(row.sponsor_id),
    type: row.type as Listing['type'],
    title: String(row.title),
    description: String(row.description),
    category: String(row.category),
    status: row.status as Listing['status'],
    currency: row.currency as Listing['currency'],
    winnerMode: row.winner_mode as Listing['winnerMode'],
    requireLink: Boolean(row.require_link),
    requireTwitter: Boolean(row.require_twitter),
    requireGithub: Boolean(row.require_github),
    deadlineAt: String(row.deadline_at),
    escrowTxHash: row.escrow_tx_hash ? String(row.escrow_tx_hash) : null,
    escrowAmount: Number(row.escrow_amount),
    escrowStatus: row.escrow_status as Listing['escrowStatus'],
    rewards: (row.rewards as Listing['rewards']) ?? [],
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function listingToRow(l: Listing) {
  return {
    id: l.id,
    sponsor_id: l.sponsorId,
    type: l.type,
    title: l.title,
    description: l.description,
    category: l.category,
    status: l.status,
    currency: l.currency,
    winner_mode: l.winnerMode,
    require_link: l.requireLink,
    require_twitter: l.requireTwitter,
    require_github: l.requireGithub,
    deadline_at: l.deadlineAt,
    escrow_tx_hash: l.escrowTxHash,
    escrow_amount: l.escrowAmount,
    escrow_status: l.escrowStatus,
    rewards: l.rewards,
    published_at: l.publishedAt,
    created_at: l.createdAt,
    updated_at: l.updatedAt,
  }
}

// ── Submissions ───────────────────────────────────────
export function rowToSubmission(row: Record<string, unknown>): Submission {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    userId: String(row.user_id),
    workUrl: String(row.work_url),
    notes: row.notes != null ? String(row.notes) : null,
    walletAddress: String(row.wallet_address),
    twitterUsername: row.twitter_username != null ? String(row.twitter_username) : null,
    githubUsername: row.github_username != null ? String(row.github_username) : null,
    status: row.status as Submission['status'],
    rank: row.rank != null ? (Number(row.rank) as 1 | 2 | 3) : null,
    creditSpent: Number(row.credit_spent),
    createdAt: String(row.created_at),
  }
}

export function submissionToRow(s: Submission) {
  return {
    id: s.id,
    listing_id: s.listingId,
    user_id: s.userId,
    work_url: s.workUrl,
    notes: s.notes,
    wallet_address: s.walletAddress,
    twitter_username: s.twitterUsername,
    github_username: s.githubUsername,
    status: s.status,
    rank: s.rank,
    credit_spent: s.creditSpent,
    created_at: s.createdAt,
  }
}

// ── Payouts ───────────────────────────────────────────
export function rowToPayout(row: Record<string, unknown>): Payout {
  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    submissionId: String(row.submission_id),
    userId: String(row.user_id),
    rank: Number(row.rank) as 1 | 2 | 3,
    amount: Number(row.amount),
    currency: row.currency as Payout['currency'],
    txHash: row.tx_hash != null ? String(row.tx_hash) : null,
    status: row.status as Payout['status'],
    createdAt: String(row.created_at),
  }
}

export function payoutToRow(p: Payout) {
  return {
    id: p.id,
    listing_id: p.listingId,
    submission_id: p.submissionId,
    user_id: p.userId,
    rank: p.rank,
    amount: p.amount,
    currency: p.currency,
    tx_hash: p.txHash,
    status: p.status,
    created_at: p.createdAt,
  }
}

// ── Credit ledger ─────────────────────────────────────
export function rowToLedger(row: Record<string, unknown>): CreditLedgerEntry {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    delta: Number(row.delta),
    reason: row.reason as CreditLedgerEntry['reason'],
    refType: row.ref_type != null ? String(row.ref_type) : null,
    refId: row.ref_id != null ? String(row.ref_id) : null,
    monthKey: String(row.month_key).slice(0, 10),
    createdAt: String(row.created_at),
    meta: (row.meta as Record<string, unknown>) ?? undefined,
  }
}

// ── Referrals ─────────────────────────────────────────
export function rowToReferral(row: Record<string, unknown>): Referral {
  return {
    id: String(row.id),
    inviterId: String(row.inviter_id),
    inviteeId: String(row.invitee_id),
    status: row.status as Referral['status'],
    validatedAt: row.validated_at != null ? String(row.validated_at) : null,
    creditAwarded: Boolean(row.credit_awarded),
    createdAt: String(row.created_at),
  }
}

export function referralToRow(r: Referral) {
  return {
    id: r.id,
    inviter_id: r.inviterId,
    invitee_id: r.inviteeId,
    status: r.status,
    validated_at: r.validatedAt,
    credit_awarded: r.creditAwarded,
    created_at: r.createdAt,
  }
}
