import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { Listing, RolePref, User } from './types.js'
import { MONTHLY_GRANT, currentMonthKey } from './services/credits.js'
import { countUsers, saveListing, saveOAuth, saveUser } from './db/repo.js'
import { useSupabase } from './db/supabase.js'

async function makeUser(opts: {
  email: string
  password: string
  displayName: string
  defaultRole?: RolePref
  nimiqAddress?: string | null
}): Promise<User> {
  const now = new Date().toISOString()
  const id = nanoid()
  const code = `GIGS-${opts.displayName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`
  const user: User = {
    id,
    email: opts.email,
    passwordHash: await bcrypt.hash(opts.password, 10),
    emailVerifiedAt: now,
    displayName: opts.displayName,
    defaultRole: opts.defaultRole ?? 'freelance',
    nimiqAddress: opts.nimiqAddress ?? null,
    walletProof: opts.nimiqAddress
      ? {
          message: 'seed',
          signature: 'seed',
          method: 'demo',
          verifiedAt: now,
        }
      : null,
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

export async function seedDemo() {
  const n = await countUsers()
  if (n > 0) {
    console.log(`[seed] skip — ${n} users already exist (${useSupabase() ? 'supabase' : 'memory'})`)
    return
  }

  const sponsor = await makeUser({
    email: 'sponsor@nimigigs.demo',
    password: 'demo1234',
    displayName: 'SponsorDemo',
    defaultRole: 'sponsor',
    nimiqAddress: 'NQ07 TEST SPONSOR DEMO ADDRESS 0001',
  })

  const talent = await makeUser({
    email: 'talent@nimigigs.demo',
    password: 'demo1234',
    displayName: 'TalentDemo',
    defaultRole: 'freelance',
    nimiqAddress: 'NQ07 TEST TALENT DEMO ADDRESS 0002',
  })

  await saveOAuth({
    id: nanoid(),
    userId: talent.id,
    provider: 'twitter',
    providerUserId: 'tw_talent',
    username: 'talentdemo',
    connectedAt: new Date().toISOString(),
  })
  await saveOAuth({
    id: nanoid(),
    userId: talent.id,
    provider: 'github',
    providerUserId: 'gh_talent',
    username: 'talentdemo',
    connectedAt: new Date().toISOString(),
  })

  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const listings: Listing[] = [
    {
      id: nanoid(),
      sponsorId: sponsor.id,
      type: 'bounty',
      title: 'Design a NimGigs logo pack',
      description:
        'Create a simple logo + favicon for NimGigs. Submit Figma or PNG link. Skill-based judging by sponsor.',
      category: 'bounty',
      status: 'open',
      currency: 'USDT',
      winnerMode: 'top3',
      requireLink: true,
      requireTwitter: true,
      requireGithub: false,
      deadlineAt: deadline,
      escrowTxHash: 'seed_lock_1',
      escrowAmount: 150,
      escrowStatus: 'locked',
      rewards: [
        { rank: 1, amount: 90, currency: 'USDT' },
        { rank: 2, amount: 40, currency: 'USDT' },
        { rank: 3, amount: 20, currency: 'USDT' },
      ],
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      sponsorId: sponsor.id,
      type: 'quest',
      title: 'Write a thread: What is Nimiq Pay?',
      description:
        'Publish an educational X thread (5+ posts) explaining Nimiq Pay Mini Apps. Link the first tweet.',
      category: 'quest',
      status: 'open',
      currency: 'NIM',
      winnerMode: 'single',
      requireLink: true,
      requireTwitter: true,
      requireGithub: false,
      deadlineAt: deadline,
      escrowTxHash: 'seed_lock_2',
      escrowAmount: 50,
      escrowStatus: 'locked',
      rewards: [{ rank: 1, amount: 50, currency: 'NIM' }],
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(),
      sponsorId: sponsor.id,
      type: 'job',
      title: 'Fix responsive layout bugs',
      description: 'Small CSS/React polish gig. Share a PR or demo link. GitHub required.',
      category: 'job',
      status: 'open',
      currency: 'USDT',
      winnerMode: 'single',
      requireLink: true,
      requireTwitter: false,
      requireGithub: true,
      deadlineAt: deadline,
      escrowTxHash: 'seed_lock_3',
      escrowAmount: 80,
      escrowStatus: 'locked',
      rewards: [{ rank: 1, amount: 80, currency: 'USDT' }],
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ]

  for (const l of listings) await saveListing(l)
  console.log(
    `[seed] demo users ready (${useSupabase() ? 'supabase' : 'memory'}): sponsor@ / talent@nimigigs.demo · demo1234`,
  )
}
