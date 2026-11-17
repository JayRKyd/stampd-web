// Demo mode: the public tour at /demo. While it is on, createClient() hands
// back an in-browser stand-in filled with a made-up shop, so every dashboard
// screen runs for real but nothing is read from or written to the database.
// Scoped to the tab (sessionStorage) and switched off the moment the visitor
// leaves the dashboard pages.

const KEY = 'stampd_demo'
const TOUR_KEY = 'stampd_demo_tour'

let on = false
let tour = false

export function isDemo(): boolean {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return on }
}

export function enterDemo(withTour = true) {
  on = true
  tour = withTour
  try {
    sessionStorage.setItem(KEY, '1')
    if (withTour) sessionStorage.setItem(TOUR_KEY, '1')
    else sessionStorage.removeItem(TOUR_KEY)
  } catch { /* private mode: the in-memory flags carry it */ }
}

export function exitDemo() {
  on = false
  tour = false
  try {
    sessionStorage.removeItem(KEY)
    sessionStorage.removeItem(TOUR_KEY)
  } catch { /* nothing to clear */ }
}

export function demoTourPending(): boolean {
  try { return sessionStorage.getItem(TOUR_KEY) === '1' } catch { return tour }
}

export function endDemoTour() {
  tour = false
  try { sessionStorage.removeItem(TOUR_KEY) } catch { /* nothing to clear */ }
}

// Pages the demo covers. Anywhere else means the visitor has left the tour.
const DEMO_PATHS = ['/demo', '/tour', '/settings', '/onboarding', '/dashboard', '/stamp', '/specials', '/gift-cards', '/customers', '/card', '/analytics', '/notifications']

export function isDemoPath(pathname: string): boolean {
  return DEMO_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}
