import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconBell, IconMessage } from './Icons'
import { PageTransition } from './PageTransition'

export function Layout() {
  const { user, role, setRole, logout } = useAuth()
  const loc = useLocation()
  const isAuthPage = loc.pathname === '/login' || loc.pathname === '/signup'

  const initial = (user?.displayName || user?.email || 'N').slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to={user ? '/board' : '/'} className="logo" aria-label="NimGigs">
          <img src="/ng-mark.svg" alt="NimGigs" className="logo-only" />
        </NavLink>

        {user && (
          <nav className="nav-links">
            <NavLink to="/board">Board</NavLink>
            <NavLink to="/my-work">My Work</NavLink>
            {role === 'sponsor' && <NavLink to="/sponsor">Sponsor</NavLink>}
            <NavLink to="/messages">Messages</NavLink>
            <NavLink to="/profile">Profile</NavLink>
          </nav>
        )}

        <div className="topbar-actions">
          {user ? (
            <>
              <NavLink to="/messages" className="icon-btn" title="Messages" aria-label="Messages">
                <IconMessage size={18} />
              </NavLink>
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

      <PageTransition />
    </div>
  )
}
