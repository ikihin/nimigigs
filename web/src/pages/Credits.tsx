import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export function Credits() {
  const { user, token } = useAuth()
  const [data, setData] = useState<Awaited<ReturnType<typeof api.credits>> | null>(null)
  const [ref, setRef] = useState<Awaited<ReturnType<typeof api.referral>> | null>(null)

  useEffect(() => {
    if (!token) return
    void api.credits(token).then(setData)
    void api.referral(token).then(setRef)
  }, [token])

  if (!user || !token) return <Navigate to="/login" replace />

  return (
    <div>
      <h1 className="page-title">Credits</h1>
      <div className="glass-card credit-card" style={{ marginBottom: 14, maxWidth: 420 }}>
        <div className="credit-card__head">
          <span>Balance</span>
          <span className="bolt-glow">⚡</span>
        </div>
        <div className="credit-card__num">{data?.balance ?? user.creditsBalance}</div>
        <p className="credit-card__sub">
          Monthly grant 4 · resets 1st UTC · leftover does not stack · {data?.month ?? user.creditsMonth}
        </p>
      </div>

      <div className="glass-card" style={{ marginBottom: 14 }}>
        <h3>Referral</h3>
        {ref && (
          <>
            <p>
              Code: <strong>{ref.code}</strong>
            </p>
            <p className="muted">
              Invites this month: {ref.invitesMonth} · Credits from referral: {ref.creditsFromReferralMonth}/
              {ref.cap}
            </p>
            <p className="muted">2 valid invites = +1 credit (wallet + verified)</p>
          </>
        )}
      </div>

      <div className="glass-card">
        <h3>Rules</h3>
        <ul className="muted" style={{ margin: 0 }}>
          <li>1 submit = 1 credit</li>
          <li>Win any rank = +1 credit</li>
          <li>Referral max +5 credits / month</li>
        </ul>
      </div>
    </div>
  )
}
