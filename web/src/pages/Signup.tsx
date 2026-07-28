import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { connectAndSign } from '../lib/nimiq'
import { HUB_ENDPOINT } from '../lib/hub'

export function Signup() {
  const { signup, loginWithWallet, user, loading } = useAuth()
  const { status } = useWallet()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(params.get('ref') || '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <div className="auth-shell"><p className="muted">Loading account…</p></div>
  if (user) return <Navigate to="/board" replace />

  async function onWalletConnect() {
    setBusy(true)
    setError(null)
    try {
      const proof = await connectAndSign('signup')
      await loginWithWallet({
        address: proof.address,
        message: proof.message,
        signature: proof.signature,
        publicKey: proof.publicKey,
        method: proof.method,
      })
      nav('/onboarding')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet signup failed')
    } finally {
      setBusy(false)
    }
  }

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
        <img src="/ng-mark.svg" alt="NimGigs" className="auth-logo-only" />
        <p className="muted" style={{ margin: 0 }}>
          Create your account
        </p>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="glass-card" style={{ textAlign: 'center', padding: '24px' }}>
        <h3>Nimiq wallet</h3>
        <p className="muted" style={{ marginBottom: 20 }}>
          The fastest way to join. Connect via Nimiq Pay or{' '}
          <a href={HUB_ENDPOINT} target="_blank" rel="noreferrer">
            hub.nimiq.com
          </a>
          .
        </p>
        <button
          className="btn btn-primary btn-block btn-lg"
          onClick={onWalletConnect}
          disabled={busy || status === 'connecting'}
        >
          {status === 'connecting' ? 'Check your wallet…' : 'Connect Nimiq Wallet'}
        </button>
      </div>

      <div className="auth-divider">
        <span>OR USE EMAIL</span>
      </div>

      <form className="glass-card" onSubmit={onSubmit} style={{ opacity: 0.8 }}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
        <button className="btn btn-ghost btn-block" type="submit" disabled={busy}>
          {busy ? '…' : 'Create account'}
        </button>
      </form>
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
