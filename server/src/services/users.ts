import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { OAuthAccount, PublicUser, RolePref, User } from '../types.js'
import { ensureMonth, MONTHLY_GRANT, currentMonthKey, onInviteValid } from './credits.js'
import {
  createSessionToken,
  deleteOAuth,
  findUserByEmail,
  findUserById,
  findUserByWalletAddress,
  findUserIdByReferral,
  findUserIdBySession,
  getOAuthAccount,
  getOAuthAccountByProvider,
  listReferralsByInvitee,
  referralCodeExists,
  saveOAuth,
  saveReferral,
  saveUser,
} from '../db/repo.js'

function makeReferralCode(): string {
  return `GIGS-${nanoid(6).toUpperCase()}`
}

export async function toPublicUser(user: User): Promise<PublicUser> {
  await ensureMonth(user)
  const twitter = (await getOAuthAccount(user.id, 'twitter'))?.username ?? null
  const github = (await getOAuthAccount(user.id, 'github'))?.username ?? null
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    defaultRole: user.defaultRole,
    nimiqAddress: user.nimiqAddress,
    walletLinked: Boolean(user.nimiqAddress && user.walletProof?.signature),
    walletMethod: user.walletProof?.method ?? null,
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
  if (await findUserByEmail(email)) {
    throw new Error('EMAIL_TAKEN')
  }

  let referredBy: string | null = null
  if (input.referralCode?.trim()) {
    const inviterId = await findUserIdByReferral(input.referralCode.trim().toUpperCase())
    if (!inviterId) throw new Error('INVALID_REFERRAL')
    referredBy = inviterId
  }

  const now = new Date().toISOString()
  const id = nanoid()
  let code = makeReferralCode()
  while (await referralCodeExists(code)) code = makeReferralCode()

  const user: User = {
    id,
    email,
    passwordHash: await bcrypt.hash(input.password, 10),
    emailVerifiedAt: now,
    displayName: input.displayName?.trim() || email.split('@')[0],
    defaultRole: 'freelance',
    nimiqAddress: null,
    walletProof: null,
    referralCode: code,
    referredByUserId: referredBy,
    creditsBalance: MONTHLY_GRANT,
    creditsMonth: currentMonthKey(),
    referralCreditsMonth: 0,
    referralInvitesMonth: 0,
    createdAt: now,
    updatedAt: now,
  }

  await saveUser(user)

  if (referredBy) {
    await saveReferral({
      id: nanoid(),
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
  const user = await findUserByEmail(email.trim().toLowerCase())
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? ensureMonth(user) : null
}

export async function getUser(id: string): Promise<User | null> {
  const u = await findUserById(id)
  return u ? ensureMonth(u) : null
}

export async function createSession(userId: string): Promise<string> {
  return createSessionToken(userId)
}

export async function userFromToken(token: string | undefined | null): Promise<User | null> {
  if (!token) return null
  const userId = await findUserIdBySession(token)
  if (!userId) return null
  return getUser(userId)
}

export async function updateProfile(
  user: User,
  patch: { displayName?: string; defaultRole?: RolePref },
): Promise<User> {
  if (patch.displayName !== undefined) user.displayName = patch.displayName.trim()
  if (patch.defaultRole) user.defaultRole = patch.defaultRole
  user.updatedAt = new Date().toISOString()
  await saveUser(user)
  return user
}

export async function setWallet(
  user: User,
  address: string,
  proof?: {
    message?: string
    signature?: string
    publicKey?: string
    method?: string
  },
): Promise<User> {
  user.nimiqAddress = address.replace(/\s+/g, ' ').trim()
  if (proof?.signature && proof?.message) {
    user.walletProof = {
      message: proof.message,
      signature: proof.signature,
      publicKey: proof.publicKey,
      method: proof.method || 'unknown',
      verifiedAt: new Date().toISOString(),
    }
  }
  user.updatedAt = new Date().toISOString()
  await saveUser(user)
  await maybeValidateReferral(user)
  return user
}

export async function maybeValidateReferral(invitee: User) {
  if (!invitee.referredByUserId || !invitee.emailVerifiedAt || !invitee.nimiqAddress) return

  const refs = await listReferralsByInvitee(invitee.id)
  for (const ref of refs) {
    if (ref.status === 'valid') continue
    ref.status = 'valid'
    ref.validatedAt = new Date().toISOString()
    const inviter = await getUser(ref.inviterId)
    if (inviter) {
      await onInviteValid(inviter, invitee.id)
      ref.creditAwarded = true
    }
    await saveReferral(ref)
  }
}

export async function connectOAuth(
  user: User,
  provider: 'twitter' | 'github',
  username: string,
  providerUserId?: string,
): Promise<OAuthAccount> {
  const account: OAuthAccount = {
    id: nanoid(),
    userId: user.id,
    provider,
    providerUserId: providerUserId ?? `${provider}_${username}`,
    username: username.replace(/^@/, ''),
    connectedAt: new Date().toISOString(),
  }
  await saveOAuth(account)
  return account
}

export async function getOAuth(userId: string, provider: 'twitter' | 'github') {
  return getOAuthAccount(userId, provider)
}

export async function disconnectOAuthProvider(userId: string, provider: 'twitter' | 'github') {
  await deleteOAuth(userId, provider)
}

export async function loginWithWallet(
  address: string,
  proof: { message: string; signature: string; publicKey?: string; method: string },
): Promise<User> {
  const existing = await findUserByWalletAddress(address)
  if (existing) {
    existing.walletProof = {
      ...proof,
      verifiedAt: new Date().toISOString(),
    }
    await saveUser(existing)
    return existing
  }

  // New user by wallet
  const id = nanoid()
  const now = new Date().toISOString()
  let code = makeReferralCode()
  while (await referralCodeExists(code)) code = makeReferralCode()

  // Use placeholder for email/pass
  const user: User = {
    id,
    email: `${address.slice(0, 8)}@nimiq.wallet`, // Placeholder
    passwordHash: 'wallet_authenticated',
    emailVerifiedAt: now,
    displayName: address.slice(0, 10), // Default name
    defaultRole: 'freelance',
    nimiqAddress: address.replace(/\s+/g, ' ').trim(),
    walletProof: {
      ...proof,
      verifiedAt: now,
    },
    referralCode: code,
    referredByUserId: null,
    creditsBalance: MONTHLY_GRANT,
    creditsMonth: currentMonthKey(),
    referralCreditsMonth: 0,
    referralInvitesMonth: 0,
    createdAt: now,
    updatedAt: now,
  }

  await saveUser(user)
  return user
}

