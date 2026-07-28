import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Listing, Submission } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'

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

  // form
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
      // Lock: for NIM use Mini App pay; USDT demo tx hash in scaffold
      let tx = `demo_lock_${Date.now()}`
      if (currency === 'NIM') {
        // Placeholder escrow recipient — replace with real escrow address
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

  return (
    <div>
      <h1 className="page-title">Sponsor</h1>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <button className="btn block" type="button" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? 'Close form' : '+ Create listing'}
      </button>

      {showCreate && (
        <form className="card" onSubmit={create} style={{ marginTop: 12 }}>
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="bounty">Bounty</option>
              <option value="quest">Quest</option>
              <option value="job">Job</option>
            </select>
          </div>
          <div className="field">
            <label>Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>1st</label>
              <input type="number" min={1} value={r1} onChange={(e) => setR1(Number(e.target.value))} />
            </div>
            {winnerMode === 'top3' && (
              <>
                <div className="field" style={{ flex: 1 }}>
                  <label>2nd</label>
                  <input type="number" min={0} value={r2} onChange={(e) => setR2(Number(e.target.value))} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>3rd</label>
                  <input type="number" min={0} value={r3} onChange={(e) => setR3(Number(e.target.value))} />
                </div>
              </>
            )}
          </div>
          <label className="muted">
            <input type="checkbox" checked={requireTwitter} onChange={(e) => setRequireTwitter(e.target.checked)} />{' '}
            Require Twitter
          </label>
          <br />
          <label className="muted">
            <input type="checkbox" checked={requireGithub} onChange={(e) => setRequireGithub(e.target.checked)} />{' '}
            Require GitHub
          </label>
          <button className="btn block" style={{ marginTop: 12 }} type="submit" disabled={busy}>
            {busy ? '…' : 'Lock reward & publish'}
          </button>
        </form>
      )}

      <h2 style={{ fontSize: '1.05rem', marginTop: 20 }}>Your listings</h2>
      {listings.map((l) => (
        <div key={l.id} className="card">
          <div className="row">
            <span className={`badge ${l.type}`}>{l.type}</span>
            <span className="badge">{l.status}</span>
          </div>
          <h3>{l.title}</h3>
          <p className="muted">
            {l.escrowAmount} {l.currency} · {l.escrowStatus}
          </p>
          <div className="row">
            <Link className="btn secondary" to={`/listings/${l.id}`}>
              View
            </Link>
            {(l.status === 'open' || l.status === 'closed') && l.escrowStatus === 'locked' && (
              <button className="btn" type="button" onClick={() => openManage(l.id)}>
                Manage / winners
              </button>
            )}
          </div>
        </div>
      ))}

      {manageId && (
        <div className="card">
          <h3>Pick winners</h3>
          {subs.length === 0 && <p className="muted">No submissions yet.</p>}
          {subs.map((s) => (
            <div key={s.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
              <strong>{s.user?.displayName || s.userId}</strong>
              <div className="muted">
                <a href={s.workUrl} target="_blank" rel="noreferrer">
                  {s.workUrl}
                </a>
              </div>
              <p className="locked">
                🐦 {s.twitterUsername || '—'} · 🐙 {s.githubUsername || '—'}
              </p>
              <select
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
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn secondary" type="button" onClick={() => setManageId(null)}>
              Cancel
            </button>
            <button className="btn" type="button" disabled={busy} onClick={confirmWinners}>
              Confirm winners & release
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
