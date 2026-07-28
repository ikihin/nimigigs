import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Listing } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { TaskCard } from '../components/TaskCard'
import { DashboardSidebar } from '../components/DashboardSidebar'
import { IconSearch } from '../components/Icons'

const CHIPS = [
  'all',
  'bounty',
  'quest',
  'job',
  'design',
  'development',
  'content',
  'marketing',
  'ai',
] as const

export function Board() {
  const { user, token, role } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [chip, setChip] = useState<string>('all')
  const [q, setQ] = useState('')
  const [currency, setCurrency] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [sort, setSort] = useState('new')
  const [error, setError] = useState<string | null>(null)

  const apiType =
    chip === 'bounty' || chip === 'quest' || chip === 'job' ? chip : undefined

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.listings({ type: apiType, q: q || undefined }, token)
        if (!cancelled) setListings(res.listings)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiType, q, token, user])

  const filtered = useMemo(() => {
    let items = [...listings]
    if (chip === 'design' || chip === 'content' || chip === 'marketing' || chip === 'ai') {
      items = items.filter((l) => l.category.toLowerCase().includes(chip === 'ai' ? 'ai' : chip))
    }
    if (chip === 'development') {
      items = items.filter((l) => l.category.toLowerCase().includes('dev'))
    }
    if (currency !== 'all') {
      items = items.filter((l) => l.currency === currency || l.currency === 'BOTH')
    }
    if (difficulty !== 'all') {
      items = items.filter((l) => {
        const d = l.escrowAmount >= 100 ? 'hard' : l.escrowAmount >= 50 ? 'medium' : 'easy'
        return d === difficulty
      })
    }
    if (sort === 'reward') {
      items.sort((a, b) => b.escrowAmount - a.escrowAmount)
    } else if (sort === 'ending') {
      items.sort((a, b) => +new Date(a.deadlineAt) - +new Date(b.deadlineAt))
    } else {
      items.sort((a, b) => (b.publishedAt || b.createdAt).localeCompare(a.publishedAt || a.createdAt))
    }
    return items
  }, [listings, chip, currency, difficulty, sort])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div>
      <section className="hero-panel">
        <div>
          <div className="hero-kicker">Nimiq Pay · Mini App</div>
          <h1 className="hero-title">
            Complete Tasks.
            <br />
            Earn Rewards.
            <br />
            <em>On Nimiq.</em>
          </h1>
          <p className="hero-desc">
            Premium bounty, quest, and freelance marketplace. Lock rewards in USDT &amp; NIM. Ship
            work. Get paid.
          </p>
          <div className="hero-cta">
            <a href="#tasks" className="btn btn-primary">
              Explore Tasks
            </a>
            <Link to={role === 'sponsor' ? '/sponsor' : '/sponsor'} className="btn btn-ghost">
              Create Bounty
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden>
          <span className="particle" />
          <span className="particle" />
          <span className="particle" />
          <span className="particle" />
          <span className="particle" />
          <div className="hero-orb">
            <img src="/ng-mark.svg" alt="NimGigs" />
          </div>
        </div>
      </section>

      <div className="search-dock" id="tasks">
        <div className="search-field">
          <IconSearch size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks, skills, keywords…"
            aria-label="Search"
          />
        </div>
        <div className="search-field">
          <select value={chip} onChange={(e) => setChip(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            <option value="design">Design</option>
            <option value="development">Development</option>
            <option value="content">Content</option>
            <option value="marketing">Marketing</option>
            <option value="ai">AI</option>
          </select>
        </div>
        <div className="search-field">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty">
            <option value="all">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="search-field">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
            <option value="all">Any currency</option>
            <option value="USDT">USDT</option>
            <option value="NIM">NIM</option>
          </select>
        </div>
        <div className="search-field">
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="new">Newest</option>
            <option value="reward">Highest reward</option>
            <option value="ending">Ending soon</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-sm">
          Search
        </button>
      </div>

      <div className="chip-row">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            className={`float-chip ${chip === c ? 'active' : ''}`}
            onClick={() => setChip(c)}
          >
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="dash-layout">
        <div className="dash-main">
          {filtered.length === 0 ? (
            <div className="empty-state">No open tasks match your filters.</div>
          ) : (
            <div className="task-list">
              {filtered.map((l) => (
                <TaskCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
        <DashboardSidebar />
      </div>
    </div>
  )
}
