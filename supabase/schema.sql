-- NimGigs schema for Supabase (Postgres)
-- Run in Supabase SQL Editor: Dashboard → SQL → New query → paste → Run

create extension if not exists "pgcrypto";

-- ── Users (email + password hash) ─────────────────────
create table if not exists public.users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  email_verified_at timestamptz,
  display_name text not null,
  default_role text not null default 'freelance' check (default_role in ('freelance', 'sponsor')),
  nimiq_address text,
  wallet_proof jsonb,
  referral_code text not null unique,
  referred_by_user_id text references public.users(id) on delete set null,
  credits_balance int not null default 4,
  credits_month date not null,
  referral_credits_month int not null default 0,
  referral_invites_month int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_referral_code_idx on public.users (referral_code);

-- ── Sessions ──────────────────────────────────────────
create table if not exists public.sessions (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);

-- ── OAuth accounts ────────────────────────────────────
create table if not exists public.oauth_accounts (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('twitter', 'github')),
  provider_user_id text not null,
  username text not null,
  connected_at timestamptz not null default now(),
  unique (user_id, provider),
  unique (provider, provider_user_id)
);

-- ── Listings ──────────────────────────────────────────
create table if not exists public.listings (
  id text primary key,
  sponsor_id text not null references public.users(id) on delete cascade,
  type text not null check (type in ('bounty', 'quest', 'job')),
  title text not null,
  description text not null,
  category text not null default 'other',
  status text not null default 'pending_lock',
  currency text not null,
  winner_mode text not null check (winner_mode in ('single', 'top3')),
  require_link boolean not null default true,
  require_twitter boolean not null default false,
  require_github boolean not null default false,
  deadline_at timestamptz not null,
  escrow_tx_hash text,
  escrow_amount numeric not null,
  escrow_status text not null default 'none',
  rewards jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on public.listings (status, deadline_at);
create index if not exists listings_sponsor_idx on public.listings (sponsor_id);

-- ── Submissions ───────────────────────────────────────
create table if not exists public.submissions (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  work_url text not null,
  notes text,
  wallet_address text not null,
  twitter_username text,
  github_username text,
  status text not null default 'submitted',
  rank int,
  credit_spent int not null default 1,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create index if not exists submissions_user_idx on public.submissions (user_id);
create index if not exists submissions_listing_idx on public.submissions (listing_id);

-- ── Payouts ───────────────────────────────────────────
create table if not exists public.payouts (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  submission_id text not null references public.submissions(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  rank int not null,
  amount numeric not null,
  currency text not null,
  tx_hash text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ── Credit ledger ─────────────────────────────────────
create table if not exists public.credit_ledger (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_type text,
  ref_id text,
  month_key date not null,
  created_at timestamptz not null default now(),
  meta jsonb
);

create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- ── Referrals ─────────────────────────────────────────
create table if not exists public.referrals (
  id text primary key,
  inviter_id text not null references public.users(id) on delete cascade,
  invitee_id text not null unique references public.users(id) on delete cascade,
  status text not null default 'pending',
  validated_at timestamptz,
  credit_awarded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Service role bypasses RLS; enable RLS for safety if using anon key from client
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.oauth_accounts enable row level security;
alter table public.listings enable row level security;
alter table public.submissions enable row level security;
alter table public.payouts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.referrals enable row level security;

-- No public policies: API uses service_role key only (server-side).
