import type {
  CreditLedgerEntry,
  Listing,
  OAuthAccount,
  Payout,
  Referral,
  Submission,
  User,
} from '../types.js'

export const store = {
  users: new Map<string, User>(),
  usersByEmail: new Map<string, string>(),
  usersByReferral: new Map<string, string>(),
  oauth: new Map<string, OAuthAccount>(), // key: userId:provider
  listings: new Map<string, Listing>(),
  submissions: new Map<string, Submission>(),
  payouts: new Map<string, Payout>(),
  creditLedger: [] as CreditLedgerEntry[],
  referrals: new Map<string, Referral>(),
  sessions: new Map<string, string>(), // token -> userId
}

export function resetStore() {
  store.users.clear()
  store.usersByEmail.clear()
  store.usersByReferral.clear()
  store.oauth.clear()
  store.listings.clear()
  store.submissions.clear()
  store.payouts.clear()
  store.creditLedger.length = 0
  store.referrals.clear()
  store.sessions.clear()
}
