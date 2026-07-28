import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export function Landing() {
  const { user, loading } = useAuth()
  if (loading) return <p className="muted">Loading…</p>
  if (user) return <Navigate to="/board" replace />

  return (
    <div className="hero">
      <img src="/logo-nimigigs.svg" alt="NimGigs" className="hero-logo" />
      <h1>Ship work. Get paid on Nimiq.</h1>
      <p className="muted">
        Bounties, quests, and jobs with locked rewards in USDT &amp; NIM. Submit with credits —
        win, get paid, earn more credits.
      </p>
      <div className="row" style={{ marginTop: 18 }}>
        <Link className="btn" to="/signup">
          Get started
        </Link>
        <Link className="btn secondary" to="/login">
          Log in
        </Link>
      </div>

      <div className="card" style={{ marginTop: 28 }}>
        <h3>How it works</h3>
        <ol className="muted" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Connect Nimiq wallet (and Twitter / GitHub for verified submits)</li>
          <li>Browse the board — each submit costs 1 credit (4 / month)</li>
          <li>Sponsors lock rewards; pick 1st / 2nd / 3rd; payout via Nimiq Pay</li>
          <li>Win → +1 credit · Invite 2 friends → +1 (max +5 / month)</li>
        </ol>
      </div>

      <div className="card">
        <h3>Demo accounts</h3>
        <p className="muted" style={{ margin: 0 }}>
          sponsor@nimigigs.demo / talent@nimigigs.demo
          <br />
          password: <code>demo1234</code>
        </p>
      </div>
    </div>
  )
}
