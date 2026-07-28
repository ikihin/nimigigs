export type RolePref = 'freelance' | 'sponsor'
export type ListingType = 'bounty' | 'quest' | 'job'

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

export interface ListingReward {
  rank: 1 | 2 | 3
  amount: number
  currency: 'USDT' | 'NIM'
}

export interface Listing {
  id: string
  sponsorId: string
  type: ListingType
  title: string
  description: string
  category: string
  status: string
  currency: string
  winnerMode: 'single' | 'top3'
  requireLink: boolean
  requireTwitter: boolean
  requireGithub: boolean
  deadlineAt: string
  escrowTxHash: string | null
  escrowAmount: number
  escrowStatus: string
  rewards: ListingReward[]
  publishedAt: string | null
  createdAt: string
  submitCount?: number
  hasSubmitted?: boolean
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
  status: string
  rank: 1 | 2 | 3 | null
  creditSpent: number
  createdAt: string
  listing?: Listing | null
  user?: { id: string; displayName: string; nimiqAddress: string | null } | null
}
