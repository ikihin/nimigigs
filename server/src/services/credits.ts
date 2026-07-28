import type { User } from '../types.js'
import {
  listLedger,
  makeLedger,
  pushLedgerEntry,
  saveUser,
} from '../db/repo.js'

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

/** Reset balance to monthly grant when calendar month changes (UTC). */
export async function ensureMonth(user: User): Promise<User> {
  const month = currentMonthKey()
  if (user.creditsMonth === month) return user

  await pushLedgerEntry(
    makeLedger(user.id, -user.creditsBalance, 'reset', user.creditsMonth, {
      meta: { previousBalance: user.creditsBalance },
    }),
  )
  user.creditsBalance = MONTHLY_GRANT
  user.creditsMonth = month
  user.referralCreditsMonth = 0
  user.referralInvitesMonth = 0
  user.updatedAt = new Date().toISOString()
  await pushLedgerEntry(makeLedger(user.id, MONTHLY_GRANT, 'monthly_grant', month))
  await saveUser(user)
  return user
}

export async function spendSubmit(user: User, submissionId: string): Promise<User> {
  await ensureMonth(user)
  if (user.creditsBalance < SUBMIT_COST) {
    throw new Error('CREDITS_EMPTY')
  }
  user.creditsBalance -= SUBMIT_COST
  user.updatedAt = new Date().toISOString()
  await pushLedgerEntry(
    makeLedger(user.id, -SUBMIT_COST, 'submit', user.creditsMonth, {
      refType: 'submission',
      refId: submissionId,
    }),
  )
  await saveUser(user)
  return user
}

export async function awardWin(user: User, submissionId: string): Promise<User> {
  await ensureMonth(user)
  user.creditsBalance += WIN_BONUS
  user.updatedAt = new Date().toISOString()
  await pushLedgerEntry(
    makeLedger(user.id, WIN_BONUS, 'win', user.creditsMonth, {
      refType: 'submission',
      refId: submissionId,
    }),
  )
  await saveUser(user)
  return user
}

export async function onInviteValid(inviter: User, inviteeId: string): Promise<User> {
  await ensureMonth(inviter)
  inviter.referralInvitesMonth += 1

  const underCap = inviter.referralCreditsMonth < REFERRAL_CAP_PER_MONTH
  const pairComplete = inviter.referralInvitesMonth % REFERRAL_PAIR === 0

  if (underCap && pairComplete) {
    inviter.creditsBalance += 1
    inviter.referralCreditsMonth += 1
    await pushLedgerEntry(
      makeLedger(inviter.id, 1, 'referral', inviter.creditsMonth, {
        refType: 'referral',
        refId: inviteeId,
      }),
    )
  }

  inviter.updatedAt = new Date().toISOString()
  await saveUser(inviter)
  return inviter
}

export async function ledgerForUser(userId: string, limit = 50) {
  return listLedger(userId, limit)
}
