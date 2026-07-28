import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Submission } from '../lib/types'
import { useAuth } from '../context/AuthContext'

export function MyWork() {
  const { user, token } = useAuth()
  const [subs, setSubs] = useState<Submission[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    void api
      .mySubmissions(token)
      .then((r) => setSubs(r.submissions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
  }, [token])

  if (!user || !token) return <Navigate to="/login" replace />

  return (
    <div>
      <h1 className="page-title">My work</h1>
      {error && <div className="alert error">{error}</div>}
      {subs.length === 0 && <p className="muted">No submissions yet.</p>}
      {subs.map((s) => (
        <div key={s.id} className="glass-card" style={{ marginBottom: 12 }}>
          <h3>{s.listing?.title || s.listingId}</h3>
          <div className="meta">
            <span>Status: {s.status}</span>
            {s.rank && <span>Rank: {s.rank}</span>}
            <span>{new Date(s.createdAt).toLocaleString()}</span>
          </div>
          <a href={s.workUrl} target="_blank" rel="noreferrer" className="muted">
            {s.workUrl}
          </a>
          {s.listing && (
            <div style={{ marginTop: 8 }}>
              <Link to={`/listings/${s.listingId}`}>View listing</Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
