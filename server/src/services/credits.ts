import { nanoid } from 'nanoid'
import { store } from '../db/store.js'
import type { CreditReason, User } from '../types.js'

export const MONTHLY_GRANT = 4
export const SUBMIT_COST = 1
export const WIN_BONUS = 1
export const REFERRAL_PAIR = 2
export const REFERRAL_CAP_PER_MONTH = 5

export function currentMonthKey(d = new Date()): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function pushLedger(
  userId: string,
  delta: number,
  reason: CreditReason,
  monthKey: string,
  ref?: { refType?: string; refId?: string; meta?: Record<string, unknown> },
) {
  store.creditLedger.push({
    id: nanoid(),
    userId,
    delta,
    reason,
    refType: ref?.refType ?? null,
    refId: ref?.refId ?? null,
    monthKey,
    createdAt: new Date().toISOString(),
    meta: ref?.meta,
  })
}

/** Reset balance to monthly grant when calendar month changes (UTC). */
export function ensureMonth(user: User): User {
  const month = currentMonthKey()
  if (user.creditsMonth === month) return user

  pushLedger(user.id, -user.creditsBalance, 'reset', user.creditsMonth, {
    meta: { previousBalance: user.creditsBalance },
  })
  user.creditsBalance = MONTHLY_GRANT
  user.creditsMonth = month
  user.referralCreditsMonth = 0
  user.referralInvitesMonth = 0
  user.updatedAt = new Date().toISOString()
  pushLedger(user.id, MONTHLY_GRANT, 'monthly_grant', month)
  store.users.set(user.id, user)
  return user
}

export function spendSubmit(user: User, submissionId: string): User {
  ensureMonth(user)
  if (user.creditsBalance < SUBMIT_COST) {
    const err = new Error('CREDITS_EMPTY')
    throw err
  }
  user.creditsBalance -= SUBMIT_COST
  user.updatedAt = new Date().toISOString()
  pushLedger(user.id, -SUBMIT_COST, 'submit', user.creditsMonth, {
    refType: 'submission',
    refId: submissionId,
  })
  store.users.set(user.id, user)
  return user
}

export function awardWin(user: User, submissionId: string): User {
  ensureMonth(user)
  user.creditsBalance += WIN_BONUS
  user.updatedAt = new Date().toISOString()
  pushLedger(user.id, WIN_BONUS, 'win', user.creditsMonth, {
    refType: 'submission',
    refId: submissionId,
  })
  store.users.set(user.id, user)
  return user
}

/**
 * Count a validated invite. Every 2 invites → +1 credit while under monthly cap.
 */
export function onInviteValid(inviter: User, inviteeId: string): User {
  ensureMonth(inviter)
  inviter.referralInvitesMonth += 1

  const underCap = inviter.referralCreditsMonth < REFERRAL_CAP_PER_MONTH
  const pairComplete = inviter.referralInvitesMonth % REFERRAL_PAIR === 0

  if (underCap && pairComplete) {
    inviter.creditsBalance += 1
    inviter.referralCreditsMonth += 1
    pushLedger(inviter.id, 1, 'referral', inviter.creditsMonth, {
      refType: 'referral',
      refId: inviteeId,
    })
  }

  inviter.updatedAt = new Date().toISOString()
  store.users.set(inviter.id, inviter)
  return inviter
}

export function ledgerForUser(userId: string, limit = 50) {
  return store.creditLedger
    .filter((e) => e.userId === userId)
    .slice(-limit)
    .reverse()
}
