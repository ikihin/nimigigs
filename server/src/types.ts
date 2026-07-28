export type RolePref = 'freelance' | 'sponsor'
export type ListingType = 'bounty' | 'quest' | 'job'
export type ListingStatus = 'draft' | 'pending_lock' | 'open' | 'closed' | 'paid' | 'cancelled'
export type Currency = 'USDT' | 'NIM'
export type ListingCurrency = Currency | 'BOTH'
export type WinnerMode = 'single' | 'top3'
export type EscrowStatus = 'none' | 'locked' | 'released' | 'refunded'
export type SubmissionStatus = 'submitted' | 'winner' | 'rejected' | 'withdrawn'
export type PayoutStatus = 'pending' | 'sent' | 'failed'
export type CreditReason =
  | 'monthly_grant'
  | 'submit'
  | 'win'
  | 'referral'
  | 'admin_adjust'
  | 'reset'
export type OAuthProvider = 'twitter' | 'github'
export type ReferralStatus = 'pending' | 'valid' | 'rejected'

export interface User {
  id: string
  email: string
  passwordHash: string
  emailVerifiedAt: string | null
  displayName: string
  defaultRole: RolePref
  nimiqAddress: string | null
  referralCode: string
  referredByUserId: string | null
  creditsBalance: number
  creditsMonth: string // YYYY-MM-01
  referralCreditsMonth: number
  referralInvitesMonth: number
  createdAt: string
  updatedAt: string
}

export interface OAuthAccount {
  id: string
  userId: string
  provider: OAuthProvider
  providerUserId: string
  username: string
  connectedAt: string
}

export interface ListingReward {
  rank: 1 | 2 | 3
  amount: number
  currency: Currency
}

export interface Listing {
  id: string
  sponsorId: string
  type: ListingType
  title: string
  description: string
  category: string
  status: ListingStatus
  currency: ListingCurrency
  winnerMode: WinnerMode
  requireLink: boolean
  requireTwitter: boolean
  requireGithub: boolean
  deadlineAt: string
  escrowTxHash: string | null
  escrowAmount: number
  escrowStatus: EscrowStatus
  rewards: ListingReward[]
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Submission {
  id: string
  listingId: string
  userId: string
  workUrl: string
  notes: string | null
  walletAddress: string
  twitterUsername: string | null
  githubUsername: string | null
  status: SubmissionStatus
  rank: 1 | 2 | 3 | null
  creditSpent: number
  createdAt: string
}

export interface Payout {
  id: string
  listingId: string
  submissionId: string
  userId: string
  rank: 1 | 2 | 3
  amount: number
  currency: Currency
  txHash: string | null
  status: PayoutStatus
  createdAt: string
}

export interface CreditLedgerEntry {
  id: string
  userId: string
  delta: number
  reason: CreditReason
  refType: string | null
  refId: string | null
  monthKey: string
  createdAt: string
  meta?: Record<string, unknown>
}

export interface Referral {
  id: string
  inviterId: string
  inviteeId: string
  status: ReferralStatus
  validatedAt: string | null
  creditAwarded: boolean
  createdAt: string
}

export interface PublicUser {
  id: string
  email: string
  displayName: string
  defaultRole: RolePref
  nimiqAddress: string | null
  referralCode: string
  creditsBalance: number
  creditsMonth: string
  referralCreditsMonth: number
  referralInvitesMonth: number
  emailVerified: boolean
  twitter: string | null
  github: string | null
  createdAt: string
}
