import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Listing, Submission } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { IconBriefcase, IconTrophy, IconUsers } from '../components/Icons'

export function Sponsor() {
  const { user, token } = useAuth()
  const { payNim, isDemo } = useWallet()
  const [listings, setListings] = useState<Listing[]>([])
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [manageId, setManageId] = useState<string | null>(null)
  const [subs, setSubs] = useState<Submission[]>([])
  const [ranks, setRanks] = useState<Record<string, 1 | 2 | 3 | 0>>({})
  const [filter, setFilter] = useState<'all' | 'open' | 'paid' | 'pending_lock'>('all')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'bounty' | 'quest' | 'job'>('bounty')
  const [category, setCategory] = useState('design')
  const [currency, setCurrency] = useState<'USDT' | 'NIM'>('USDT')
  const [winnerMode, setWinnerMode] = useState<'single' | 'top3'>('top3')
  const [r1, setR1] = useState(90)
  const [r2, setR2] = useState(40)
  const [r3, setR3] = useState(20)
  const [requireTwitter, setRequireTwitter] = useState(true)
  const [requireGithub, setRequireGithub] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (!token) return
    const res = await api.myListings(token)
    setListings(res.listings)
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : 'Error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const stats = useMemo(() => {
    const open = listings.filter((l) => l.status === 'open').length
    const paid = listings.filter((l) => l.status === 'paid').length
    const locked = listings.reduce((s, l) => s + (l.escrowStatus === 'locked' ? l.escrowAmount : 0), 0)
    return { open, paid, locked, total: listings.length }
  }, [listings])

  const visible = useMemo(() => {
    if (filter === 'all') return listings
    return listings.filter((l) => l.status === filter)
  }, [listings, filter])

  if (!user || !token) return <Navigate to="/login" replace />

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const rewards =
        winnerMode === 'single'
          ? [{ rank: 1 as const, amount: r1, currency }]
          : [
              { rank: 1 as const, amount: r1, currency },
              { rank: 2 as const, amount: r2, currency },
              { rank: 3 as const, amount: r3, currency },
            ]
      const deadlineAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { listing } = await api.createListing(token, {
        type,
        title,
        description,
        category,
        deadlineAt,
        currency,
        winnerMode,
        requireLink: true,
        requireTwitter,
        requireGithub,
        rewards,
      })
      let tx = `demo_lock_${Date.now()}`
      if (currency === 'NIM') {
        const escrow = 'NQ07 ESCROW PLACEHOLDER ADDRESS 0000'
        tx = await payNim(listing.escrowAmount, escrow)
      }
      await api.lockListing(token, listing.id, tx)
      setOk(`Published: ${listing.title}${isDemo ? ' (demo lock)' : ''}`)
      setShowCreate(false)
      setTitle('')
      setDescription('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function openManage(id: string) {
    setManageId(id)
    setError(null)
    const res = await api.listingSubmissions(token!, id)
    setSubs(res.submissions)
    setRanks({})
  }

  async function confirmWinners() {
    if (!manageId || !token) return
    setBusy(true)
    setError(null)
    try {
      const winners = Object.entries(ranks)
        .filter(([, rank]) => rank > 0)
        .map(([submissionId, rank]) => ({ submissionId, rank: rank as 1 | 2 | 3 }))
      if (winners.length === 0) throw new Error('Pick at least 1st place')
      await api.setWinners(token, manageId, winners)
      const result = await api.release(token, manageId)
      setOk(`Payouts released (${result.payouts.length})`)
      setManageId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Release failed')
    } finally {
      setBusy(false)
    }
  }

  const manageListing = listings.find((l) => l.id === manageId)

  return (
    <div className="sponsor-page">
      <section className="hero-panel sponsor-hero">
        <div>
          <div className="hero-kicker">Sponsor console</div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>
            Lock rewards.
            <br />
            Pick winners.
            <br />
            <em>Ship talent.</em>
          </h1>
          <p className="hero-desc">
            Create bounties with escrowed USDT or NIM. Review submissions and release multi-winner
            payouts on Nimiq Pay.
          </p>
          <div className="hero-cta">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreate((v) => !v)}
            >
              {showCreate ? 'Close builder' : '+ Create bounty'}
            </button>
            <Link to="/board" className="btn btn-ghost">
              View board
            </Link>
          </div>
        </div>
        <div className="sponsor-stats">
          <div className="stat-tile">
            <IconBriefcase size={18} />
            <strong>{stats.total}</strong>
            <span>Listings</span>
          </div>
          <div className="stat-tile">
            <IconUsers size={18} />
            <strong>{stats.open}</strong>
            <span>Open</span>
          </div>
          <div className="stat-tile">
            <IconTrophy size={18} />
            <strong>{stats.paid}</strong>
            <span>Paid out</span>
          </div>
          <div className="stat-tile stat-tile--glow">
            <strong>{stats.locked}</strong>
            <span>Escrow active</span>
          </div>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      {showCreate && (
        <form className="glass-card create-panel" onSubmit={create}>
          <div className="create-panel__head">
            <div>
              <p className="section-label">New listing</p>
              <h2 className="page-title" style={{ margin: 0, fontSize: '1.35rem' }}>
                Bounty builder
              </h2>
            </div>
            <span className="type-pill">{currency} lock</span>
          </div>

          <div className="create-grid">
            <div className="field">
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="bounty">Bounty</option>
                <option value="quest">Quest</option>
                <option value="job">Job</option>
              </select>
            </div>
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="design">design</option>
                <option value="content">content</option>
                <option value="dev">dev</option>
                <option value="other">other</option>
              </select>
            </div>
            <div className="field create-span-2">
              <label>Title</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs shipping?" />
            </div>
            <div className="field create-span-2">
              <label>Description</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief, deliverables, acceptance criteria…"
              />
            </div>
            <div className="field">
              <label>Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as 'USDT' | 'NIM')}>
                <option value="USDT">USDT</option>
                <option value="NIM">NIM</option>
              </select>
            </div>
            <div className="field">
              <label>Winner mode</label>
              <select value={winnerMode} onChange={(e) => setWinnerMode(e.target.value as typeof winnerMode)}>
                <option value="top3">1st / 2nd / 3rd</option>
                <option value="single">Single winner</option>
              </select>
            </div>
            <div className="field">
              <label>1st reward</label>
              <input type="number" min={1} value={r1} onChange={(e) => setR1(Number(e.target.value))} />
            </div>
            {winnerMode === 'top3' && (
              <>
                <div className="field">
                  <label>2nd reward</label>
                  <input type="number" min={0} value={r2} onChange={(e) => setR2(Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>3rd reward</label>
                  <input type="number" min={0} value={r3} onChange={(e) => setR3(Number(e.target.value))} />
                </div>
              </>
            )}
          </div>

          <div className="create-checks">
            <label className="check-pill">
              <input type="checkbox" checked={requireTwitter} onChange={(e) => setRequireTwitter(e.target.checked)} />
              Require Twitter
            </label>
            <label className="check-pill">
              <input type="checkbox" checked={requireGithub} onChange={(e) => setRequireGithub(e.target.checked)} />
              Require GitHub
            </label>
          </div>

          <div className="create-foot">
            <p className="muted">
              Total lock:{' '}
              <strong style={{ color: 'var(--primary)' }}>
                {winnerMode === 'single' ? r1 : r1 + r2 + r3} {currency}
              </strong>
              {isDemo ? ' · demo escrow' : ''}
            </p>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Locking…' : 'Lock reward & publish'}
            </button>
          </div>
        </form>
      )}

      <div className="chip-row" style={{ marginTop: 8 }}>
        {(['all', 'open', 'paid', 'pending_lock'] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={`float-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="sponsor-list">
        {visible.length === 0 && <div className="empty-state">No listings in this filter.</div>}
        {visible.map((l) => (
          <article key={l.id} className="task-card sponsor-card">
            <div className={`task-art task-art--${l.type}`}>
              <span className="task-art__glyph">{l.type[0].toUpperCase()}</span>
              <div className="task-art__hex" />
            </div>
            <div className="task-body">
              <div className="task-top">
                <span className={`type-pill type-pill--${l.type}`}>{l.type}</span>
                <span className="type-pill type-pill--muted">{l.status}</span>
                <span className="type-pill">{l.escrowStatus}</span>
              </div>
              <h3 className="task-title">{l.title}</h3>
              <div className="task-meta">
                <span>
                  {l.escrowAmount} {l.currency}
                </span>
                <span>{l.winnerMode === 'top3' ? 'Top 3' : 'Single'}</span>
                <span>Ends {new Date(l.deadlineAt).toLocaleDateString()}</span>
              </div>
              <div className="row">
                <Link className="btn btn-ghost btn-sm" to={`/listings/${l.id}`}>
                  View public
                </Link>
                {(l.status === 'open' || l.status === 'closed') && l.escrowStatus === 'locked' && (
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => openManage(l.id)}>
                    Manage winners
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {manageId && manageListing && (
        <div className="manage-overlay" role="dialog" aria-modal="true">
          <div className="manage-modal glass-card">
            <div className="create-panel__head">
              <div>
                <p className="section-label">Review</p>
                <h2 className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  {manageListing.title}
                </h2>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setManageId(null)}>
                Close
              </button>
            </div>
            <p className="muted">
              Assign ranks then release escrow. Each winner receives +1 credit.
            </p>
            {subs.length === 0 && <div className="empty-state">No submissions yet.</div>}
            <div className="manage-subs">
              {subs.map((s) => (
                <div key={s.id} className="manage-sub">
                  <div className="msg-thread__avatar">{(s.user?.displayName || '?').slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{s.user?.displayName || s.userId}</strong>
                    <div className="muted truncate">
                      <a href={s.workUrl} target="_blank" rel="noreferrer">
                        {s.workUrl}
                      </a>
                    </div>
                    <p className="locked" style={{ margin: '4px 0 0' }}>
                      🐦 {s.twitterUsername || '—'} · 🐙 {s.githubUsername || '—'}
                    </p>
                  </div>
                  <select
                    className="rank-select"
                    value={ranks[s.id] ?? 0}
                    onChange={(e) =>
                      setRanks((prev) => ({ ...prev, [s.id]: Number(e.target.value) as 0 | 1 | 2 | 3 }))
                    }
                  >
                    <option value={0}>—</option>
                    <option value={1}>1st</option>
                    <option value={2}>2nd</option>
                    <option value={3}>3rd</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="create-foot">
              <p className="muted">Releases funds to winner wallets</p>
              <button className="btn btn-primary" type="button" disabled={busy} onClick={confirmWinners}>
                {busy ? 'Releasing…' : 'Confirm winners & release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
