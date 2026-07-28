import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { api } from '../lib/api'
import { HUB_ENDPOINT } from '../lib/hub'
import { isInsideNimiqPay } from '../lib/nimiq'

export function Onboarding() {
  const { user, token, setUser } = useAuth()
  const { displayAddress, connectWallet, isDemo, status } = useWallet()
  const nav = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [twitter, setTwitter] = useState('')
  const [github, setGithub] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user || !token) return <Navigate to="/login" replace />

  async function onConnectWallet() {
    setBusy(true)
    setError(null)
    try {
      await connectWallet()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet failed')
    } finally {
      setBusy(false)
    }
  }

  async function connectSocial() {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      if (twitter.trim()) {
        const { user: u } = await api.connectOAuth(token, 'twitter', twitter)
        setUser(u)
      }
      if (github.trim()) {
        const { user: u } = await api.connectOAuth(token, 'github', github)
        setUser(u)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connect failed')
    } finally {
      setBusy(false)
    }
  }

  const linked = Boolean(user.nimiqAddress)

  return (
    <div>
      <h1 className="page-title">Welcome to NimGigs</h1>
      <p className="muted">You start with 4 credits this month.</p>
      {error && <div className="alert error">{error}</div>}

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>1. Connect Nimiq wallet</h3>
        <p className="muted">
          Prove ownership by signing a message. Inside Nimiq Pay we use the Mini App provider; in a
          browser we open{' '}
          <a href={HUB_ENDPOINT} target="_blank" rel="noreferrer">
            hub.nimiq.com
          </a>{' '}
          (sign-message).
        </p>
        {isDemo && !isInsideNimiqPay() && (
          <div className="alert info">
            Browser mode — Hub popup will open for sign-message. Allow popups for this site.
          </div>
        )}
        <p className="locked">{user.nimiqAddress || displayAddress || 'Not connected'}</p>
        {user.walletMethod && (
          <p className="muted">Linked via: {user.walletMethod}</p>
        )}
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || status === 'connecting'}
          onClick={onConnectWallet}
        >
          {status === 'connecting'
            ? 'Waiting for wallet…'
            : linked
              ? 'Reconnect / re-sign'
              : 'Connect Nimiq wallet'}
        </button>
      </div>

      <div className="glass-card">
        <h3>2. Link social (recommended)</h3>
        <p className="muted">Used to verify submissions on bounties that require Twitter / GitHub.</p>
        <div className="field">
          <label>Twitter</label>
          <input
            placeholder={user.twitter || '@handle'}
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            disabled={Boolean(user.twitter)}
          />
        </div>
        <div className="field">
          <label>GitHub</label>
          <input
            placeholder={user.github || 'username'}
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            disabled={Boolean(user.github)}
          />
        </div>
        <div className="row">
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={connectSocial}>
            Save social
          </button>
          <button className="btn btn-primary" type="button" onClick={() => nav('/board')}>
            Go to board
          </button>
        </div>
      </div>
    </div>
  )
}
