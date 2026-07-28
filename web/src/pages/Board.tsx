import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Listing } from '../lib/types'
import { useAuth } from '../context/AuthContext'

export function Board() {
  const { user, token } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [type, setType] = useState<string>('all')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.listings(
          { type: type === 'all' ? undefined : type, q: q || undefined },
          token,
        )
        if (!cancelled) setListings(res.listings)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [type, q, token, user])

  if (!user) return <Navigate to="/login" replace />

  return (
    <div>
      <h1 className="page-title">Board</h1>
      <div className="tabs">
        {['all', 'bounty', 'quest', 'job'].map((t) => (
          <button key={t} type="button" className={type === t ? 'active' : ''} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="search">Search</label>
        <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="logo, thread…" />
      </div>
      {error && <div className="alert error">{error}</div>}
      {listings.length === 0 && <p className="muted">No open gigs right now.</p>}
      {listings.map((l) => (
        <Link key={l.id} to={`/listings/${l.id}`} className="card" style={{ display: 'block' }}>
          <div className="row">
            <span className={`badge ${l.type}`}>{l.type}</span>
            <span className="badge">{l.category}</span>
            {l.hasSubmitted && <span className="badge">submitted</span>}
          </div>
          <h3 style={{ marginTop: 10 }}>{l.title}</h3>
          <div className="meta">
            <span>
              💰 {l.escrowAmount} {l.currency === 'BOTH' ? 'mixed' : l.currency}
            </span>
            <span>{l.winnerMode === 'top3' ? '1st/2nd/3rd' : 'single winner'}</span>
            <span>{l.submitCount ?? 0} submits</span>
            <span>Ends {new Date(l.deadlineAt).toLocaleDateString()}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
