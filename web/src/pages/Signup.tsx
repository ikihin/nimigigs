import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Signup() {
  const { signup, user } = useAuth()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(params.get('ref') || '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/board" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signup(email, password, referralCode || undefined)
      nav('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="mark">
          <img src="/ng-mark.svg" alt="" />
        </div>
        <img src="/logo-nimigigs.svg" alt="NimGigs" className="word" />
        <p className="muted" style={{ margin: 0 }}>
          Join the marketplace
        </p>
      </div>
      {error && <div className="alert error">{error}</div>}
      <form className="glass-card" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password (min 6)</label>
          <input
            id="password"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="ref">Referral code (optional)</label>
          <input
            id="ref"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="GIGS-XXXX"
          />
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? '…' : 'Create account'}
        </button>
      </form>
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
