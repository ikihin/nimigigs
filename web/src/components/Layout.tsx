import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconBell, IconMessage } from './Icons'

export function Layout() {
  const { user, role, setRole, logout } = useAuth()
  const loc = useLocation()
  const isAuthPage = loc.pathname === '/login' || loc.pathname === '/signup'

  const initial = (user?.displayName || user?.email || 'N').slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to={user ? '/board' : '/'} className="logo" aria-label="NimGigs">
          <span className="logo-mark">
            <img src="/ng-mark.svg" alt="" />
          </span>
          <img src="/logo-nimigigs.svg" alt="NimGigs" className="logo-word" />
        </NavLink>

        {user && (
          <nav className="nav-links">
            <NavLink to="/board">Board</NavLink>
            <NavLink to="/my-work">My Work</NavLink>
            {role === 'sponsor' && <NavLink to="/sponsor">Sponsor</NavLink>}
            <NavLink to="/profile">Profile</NavLink>
          </nav>
        )}

        <div className="topbar-actions">
          {user ? (
            <>
              <button type="button" className="icon-btn" title="Messages" aria-label="Messages">
                <IconMessage size={18} />
              </button>
              <button type="button" className="icon-btn" title="Notifications" aria-label="Notifications">
                <IconBell size={18} />
                <span className="dot" />
              </button>
              <NavLink to="/credits" className="credit-chip" title="Credits">
                <span aria-hidden>⚡</span>
                <strong>{user.creditsBalance}</strong>
              </NavLink>
              <div className="role-toggle" title="Switch role">
                <button
                  type="button"
                  className={role === 'freelance' ? 'active' : ''}
                  onClick={() => setRole('freelance')}
                >
                  Freelancer
                </button>
                <button
                  type="button"
                  className={role === 'sponsor' ? 'active' : ''}
                  onClick={() => setRole('sponsor')}
                >
                  Sponsor
                </button>
              </div>
              <NavLink to="/profile" className="avatar" title={user.displayName}>
                {initial}
              </NavLink>
              {!isAuthPage && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
                  Log out
                </button>
              )}
            </>
          ) : (
            !isAuthPage && (
              <>
                <NavLink to="/login" className="btn btn-ghost btn-sm">
                  Log in
                </NavLink>
                <NavLink to="/signup" className="btn btn-primary btn-sm">
                  Get started
                </NavLink>
              </>
            )
          )}
        </div>
      </header>

      <Outlet />
    </div>
  )
}
