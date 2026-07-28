import { useLocation, useOutlet } from 'react-router-dom'

/**
 * Dark page motion: soft black veil + fade/rise on route change.
 * Uses outlet so we only remount on real route updates.
 */
export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <div className="page-motion" key={location.pathname}>
      <div className="page-motion__veil" aria-hidden />
      <div className="page-motion__content">{outlet}</div>
    </div>
  )
}
