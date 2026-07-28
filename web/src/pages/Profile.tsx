import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { api } from '../lib/api'
import { HUB_ENDPOINT } from '../lib/hub'
import { isInsideNimiqPay } from '../lib/nimiq'

export function Profile() {
  const { user, token, setUser } = useAuth()
  const { connectWallet, displayAddress, isDemo, status, lastProof } = useWallet()
  const [twitter, setTwitter] = useState('')
  const [github, setGithub] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!user || !token) return <Navigate to="/login" replace />

  async function onConnect() {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      await connectWallet()
      setMsg('Wallet connected with signed message ✓')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet error')
    } finally {
      setBusy(false)
    }
  }

  async function saveSocial(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      let u = user!
      if (twitter.trim()) {
        const res = await api.connectOAuth(token!, 'twitter', twitter)
        u = res.user
      }
      if (github.trim()) {
        const res = await api.connectOAuth(token!, 'github', github)
        u = res.user
      }
      setUser(u)
      setMsg('Social updated')
      setTwitter('')
      setGithub('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      {msg && <div className="alert ok">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <p>
          <strong>{user.displayName}</strong>
        </p>
        <p className="muted">{user.email}</p>
        <p className="muted">Referral: {user.referralCode}</p>
      </div>

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>Nimiq wallet</h3>
        <p className="muted">
          Connect via Nimiq Pay Mini App or browser Hub{' '}
          <a href={`${HUB_ENDPOINT}`} target="_blank" rel="noreferrer">
            hub.nimiq.com
          </a>{' '}
          sign-message.
        </p>
        {!isInsideNimiqPay() && isDemo && (
          <div className="alert info">Browser mode — allow popups for Hub sign-message.</div>
        )}
        <p className="locked">Address: {user.nimiqAddress || displayAddress || '—'}</p>
        <p className="muted">
          Status:{' '}
          {user.walletLinked || user.nimiqAddress
            ? `linked${user.walletMethod ? ` (${user.walletMethod})` : ''}`
            : 'not connected'}
        </p>
        {lastProof && (
          <p className="muted" style={{ wordBreak: 'break-all', fontSize: '0.78rem' }}>
            Last sig: {lastProof.signature.slice(0, 24)}…
          </p>
        )}
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || status === 'connecting'}
          onClick={onConnect}
        >
          {status === 'connecting'
            ? 'Sign in wallet…'
            : user.nimiqAddress
              ? 'Reconnect with sign-message'
              : 'Connect Nimiq wallet'}
        </button>
      </div>

      <form className="glass-card" onSubmit={saveSocial}>
        <h3>Social</h3>
        <p className="muted">
          Twitter: {user.twitter || '—'} · GitHub: {user.github || '—'}
        </p>
        <div className="field">
          <label>Twitter handle</label>
          <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@you" />
        </div>
        <div className="field">
          <label>GitHub username</label>
          <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="you" />
        </div>
        <button className="btn btn-primary" type="submit">
          Save
        </button>
      </form>
    </div>
  )
}
