import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'
import { api } from '../lib/api'
import { HUB_ENDPOINT } from '../lib/hub'
import { isInsideNimiqPay } from '../lib/nimiq'

export function Onboarding() {
  const { user, token, refreshUser } = useAuth()
  const { displayAddress, connectWallet, isDemo, status } = useWallet()
  const nav = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [oauth, setOauth] = useState<{ github: boolean; twitter: boolean } | null>(null)

  useEffect(() => {
    void api
      .oauthStatus()
      .then((s) => setOauth({ github: s.github, twitter: s.twitter }))
      .catch(() => null)
    void refreshUser()
  }, [refreshUser])

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

  async function startOAuth(provider: 'twitter' | 'github') {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const { url } = await api.oauthStart(token, provider)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OAuth start failed')
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
          Sign a message via Nimiq Pay or{' '}
          <a href={HUB_ENDPOINT} target="_blank" rel="noreferrer">
            hub.nimiq.com
          </a>
          .
        </p>
        {isDemo && !isInsideNimiqPay() && (
          <div className="alert info">Browser mode — allow Hub popups.</div>
        )}
        <p className="locked">{user.nimiqAddress || displayAddress || 'Not connected'}</p>
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
        <h3>2. Link social (OAuth)</h3>
        <p className="muted">Required for bounties that ask for Twitter or GitHub verification.</p>

        <div className="social-row">
          <div className="social-card">
            <div>
              <strong>X / Twitter</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {user.twitter ? `@${user.twitter}` : 'Not connected'}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || (oauth !== null && !oauth.twitter)}
              onClick={() => startOAuth('twitter')}
            >
              {user.twitter ? 'Reconnect X' : 'Connect X'}
            </button>
          </div>
          <div className="social-card">
            <div>
              <strong>GitHub</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {user.github ? `@${user.github}` : 'Not connected'}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || (oauth !== null && !oauth.github)}
              onClick={() => startOAuth('github')}
            >
              {user.github ? 'Reconnect GitHub' : 'Connect GitHub'}
            </button>
          </div>
        </div>

        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" type="button" onClick={() => nav('/board')}>
            Go to board
          </button>
        </div>
      </div>
    </div>
  )
}
