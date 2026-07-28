import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Listing } from '../lib/types'
import { useAuth } from '../context/AuthContext'

export function ListingDetail() {
  const { id } = useParams()
  const { user, token, setUser } = useAuth()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [workUrl, setWorkUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  useEffect(() => {
    if (!id || !token) return
    void api
      .listing(id, token)
      .then((r) => setListing(r.listing))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
  }, [id, token])

  if (!user || !token) return <Navigate to="/login" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!id || !token) return
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      const res = await api.submit(token, id, { workUrl, notes })
      setUser(res.user)
      setListing((prev) => (prev ? { ...prev, hasSubmitted: true, submitCount: (prev.submitCount ?? 0) + 1 } : prev))
      setOk('Submitted! −1 credit')
      setShowSubmit(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  if (!listing && !error) return <p className="muted">Loading…</p>
  if (!listing) return <div className="alert error">{error}</div>

  return (
    <div>
      <Link to="/board" className="muted">
        ← Board
      </Link>
      <div className="row" style={{ marginTop: 10 }}>
        <span className={`badge ${listing.type}`}>{listing.type}</span>
      </div>
      <h1 className="page-title">{listing.title}</h1>
      <div className="meta">
        <span>
          Pool: {listing.escrowAmount} {listing.currency}
        </span>
        <span>Escrow: {listing.escrowStatus}</span>
        <span>Deadline: {new Date(listing.deadlineAt).toLocaleString()}</span>
        <span>{listing.submitCount ?? 0} submissions</span>
      </div>
      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>Rewards</h3>
        <ul className="muted" style={{ margin: 0 }}>
          {listing.rewards.map((r) => (
            <li key={r.rank}>
              {r.rank === 1 ? '1st' : r.rank === 2 ? '2nd' : '3rd'}: {r.amount} {r.currency}
            </li>
          ))}
        </ul>
      </div>
      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>Description</h3>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{listing.description}</p>
        <p className="muted" style={{ marginTop: 10 }}>
          Requires:{' '}
          {[
            listing.requireLink && 'link',
            listing.requireTwitter && 'Twitter',
            listing.requireGithub && 'GitHub',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      {listing.hasSubmitted ? (
        <div className="alert info">You already submitted. See My work.</div>
      ) : (
        <>
          {!showSubmit ? (
            <button className="btn btn-primary btn-block" type="button" onClick={() => setShowSubmit(true)}>
              Submit work · costs 1 credit (you have {user.creditsBalance})
            </button>
          ) : (
            <form className="glass-card" onSubmit={onSubmit}>
              <div className="field">
                <label>Work link *</label>
                <input
                  type="url"
                  required
                  value={workUrl}
                  onChange={(e) => setWorkUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <p className="locked">Wallet: {user.nimiqAddress || 'not set'}</p>
              <p className="locked">Twitter: {user.twitter || '—'} · GitHub: {user.github || '—'}</p>
              <div className="row">
                <button className="btn btn-ghost" type="button" onClick={() => setShowSubmit(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? '…' : 'Submit · −1 credit'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}
