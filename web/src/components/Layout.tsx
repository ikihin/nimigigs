import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout() {
  const { user, role, setRole, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="logo" aria-label="NimGigs home">
          <img src="/logo-nimigigs.svg" alt="NimGigs" className="logo-img" />
        </NavLink>
        <div className="topbar-spacer" />
        {user && (
          <>
            <NavLink to="/credits" className="chip" title="Credits">
              ⚡ <strong>{user.creditsBalance}</strong>
            </NavLink>
            <div className="role-toggle" title="Switch role">
              <button
                type="button"
                className={role === 'freelance' ? 'active' : ''}
                onClick={() => setRole('freelance')}
              >
                Freelance
              </button>
              <button
                type="button"
                className={role === 'sponsor' ? 'active' : ''}
                onClick={() => setRole('sponsor')}
              >
                Sponsor
              </button>
            </div>
          </>
        )}
      </header>

      {user && (
        <nav className="nav">
          <NavLink to="/" end>
            Board
          </NavLink>
          <NavLink to="/my-work">My work</NavLink>
          {role === 'sponsor' && <NavLink to="/sponsor">Sponsor</NavLink>}
          <NavLink to="/profile">Profile</NavLink>
          <button type="button" className="btn ghost" style={{ padding: '6px 10px' }} onClick={logout}>
            Log out
          </button>
        </nav>
      )}

      <Outlet />
    </div>
  )
}
