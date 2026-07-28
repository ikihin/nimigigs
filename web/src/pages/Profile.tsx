import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { api } from '../lib/api'

export function Profile() {
  const { user, token, setUser } = useAuth()
  const { bindWalletToAccount, displayAddress, isDemo } = useWallet()
  const [twitter, setTwitter] = useState('')
  const [github, setGithub] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user || !token) return <Navigate to="/login" replace />

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
      {isDemo && <div className="alert info">Demo wallet mode (outside Nimiq Pay).</div>}

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <p>
          <strong>{user.displayName}</strong>
        </p>
        <p className="muted">{user.email}</p>
        <p className="locked">Wallet: {user.nimiqAddress || displayAddress || '—'}</p>
        <p className="muted">
          Twitter: {user.twitter || '—'} · GitHub: {user.github || '—'}
        </p>
        <p className="muted">Referral: {user.referralCode}</p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() =>
            bindWalletToAccount()
              .then(() => setMsg('Wallet linked'))
              .catch((e) => setError(e instanceof Error ? e.message : 'Wallet error'))
          }
        >
          Bind wallet to account
        </button>
      </div>

      <form className="glass-card" onSubmit={saveSocial}>
        <h3>Connect social (stub)</h3>
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
