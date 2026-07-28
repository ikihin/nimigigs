import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { store } from '../db/store.js'
import type { OAuthAccount, PublicUser, RolePref, User } from '../types.js'
import { ensureMonth, MONTHLY_GRANT, currentMonthKey } from './credits.js'
import { onInviteValid } from './credits.js'

function makeReferralCode(): string {
  return `GIGS-${nanoid(6).toUpperCase()}`
}

export function toPublicUser(user: User): PublicUser {
  ensureMonth(user)
  const twitter = store.oauth.get(`${user.id}:twitter`)?.username ?? null
  const github = store.oauth.get(`${user.id}:github`)?.username ?? null
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    defaultRole: user.defaultRole,
    nimiqAddress: user.nimiqAddress,
    referralCode: user.referralCode,
    creditsBalance: user.creditsBalance,
    creditsMonth: user.creditsMonth,
    referralCreditsMonth: user.referralCreditsMonth,
    referralInvitesMonth: user.referralInvitesMonth,
    emailVerified: Boolean(user.emailVerifiedAt),
    twitter,
    github,
    createdAt: user.createdAt,
  }
}

export async function createUser(input: {
  email: string
  password: string
  displayName?: string
  referralCode?: string
}): Promise<User> {
  const email = input.email.trim().toLowerCase()
  if (store.usersByEmail.has(email)) {
    throw new Error('EMAIL_TAKEN')
  }

  let referredBy: string | null = null
  if (input.referralCode?.trim()) {
    const inviterId = store.usersByReferral.get(input.referralCode.trim().toUpperCase())
    if (!inviterId) throw new Error('INVALID_REFERRAL')
    referredBy = inviterId
  }

  const now = new Date().toISOString()
  const id = nanoid()
  let code = makeReferralCode()
  while (store.usersByReferral.has(code)) code = makeReferralCode()

  const user: User = {
    id,
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    emailVerifiedAt: now, // scaffold: auto-verify
    displayName: input.displayName?.trim() || email.split('@')[0],
    defaultRole: 'freelance',
    nimiqAddress: null,
    referralCode: code,
    referredByUserId: referredBy,
    creditsBalance: MONTHLY_GRANT,
    creditsMonth: currentMonthKey(),
    referralCreditsMonth: 0,
    referralInvitesMonth: 0,
    createdAt: now,
    updatedAt: now,
  }

  store.users.set(id, user)
  store.usersByEmail.set(email, id)
  store.usersByReferral.set(code, id)

  if (referredBy) {
    const refId = nanoid()
    store.referrals.set(refId, {
      id: refId,
      inviterId: referredBy,
      inviteeId: id,
      status: 'pending',
      validatedAt: null,
      creditAwarded: false,
      createdAt: now,
    })
  }

  return user
}

export async function authenticate(email: string, password: string): Promise<User | null> {
  const id = store.usersByEmail.get(email.trim().toLowerCase())
  if (!id) return null
  const user = store.users.get(id)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? ensureMonth(user) : null
}

export function getUser(id: string): User | null {
  const u = store.users.get(id)
  return u ? ensureMonth(u) : null
}

export function createSession(userId: string): string {
  const token = nanoid(32)
  store.sessions.set(token, userId)
  return token
}

export function userFromToken(token: string | undefined | null): User | null {
  if (!token) return null
  const userId = store.sessions.get(token)
  if (!userId) return null
  return getUser(userId)
}

export function updateProfile(
  user: User,
  patch: { displayName?: string; defaultRole?: RolePref },
): User {
  if (patch.displayName !== undefined) user.displayName = patch.displayName.trim()
  if (patch.defaultRole) user.defaultRole = patch.defaultRole
  user.updatedAt = new Date().toISOString()
  store.users.set(user.id, user)
  return user
}

export function setWallet(user: User, address: string): User {
  user.nimiqAddress = address.replace(/\s+/g, ' ').trim()
  user.updatedAt = new Date().toISOString()
  store.users.set(user.id, user)
  maybeValidateReferral(user)
  return user
}

/** Validate referral when invitee has email verified + wallet. */
export function maybeValidateReferral(invitee: User) {
  if (!invitee.referredByUserId || !invitee.emailVerifiedAt || !invitee.nimiqAddress) return

  for (const ref of store.referrals.values()) {
    if (ref.inviteeId !== invitee.id || ref.status === 'valid') continue
    ref.status = 'valid'
    ref.validatedAt = new Date().toISOString()
    const inviter = getUser(ref.inviterId)
    if (inviter) {
      onInviteValid(inviter, invitee.id)
      ref.creditAwarded = true
    }
    store.referrals.set(ref.id, ref)
  }
}

export function connectOAuth(
  user: User,
  provider: 'twitter' | 'github',
  username: string,
  providerUserId?: string,
): OAuthAccount {
  const key = `${user.id}:${provider}`
  const account: OAuthAccount = {
    id: nanoid(),
    userId: user.id,
    provider,
    providerUserId: providerUserId ?? `${provider}_${username}`,
    username: username.replace(/^@/, ''),
    connectedAt: new Date().toISOString(),
  }
  store.oauth.set(key, account)
  return account
}

export function getOAuth(userId: string, provider: 'twitter' | 'github') {
  return store.oauth.get(`${userId}:${provider}`) ?? null
}
