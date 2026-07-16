// Counter (kiosk) mode: locks THIS DEVICE's dashboard to the Stamp page so
// staff can issue stamps without seeing analytics, customers, or settings.
// Device-scoped by design (localStorage): the counter iPad stays locked
// while the owner's own laptop remains fully open under the same account.
// Exiting requires re-entering the account password.

const KEY = 'stampd_kiosk_mode'
export const KIOSK_EVENT = 'stampd:kiosk-change'

export function isKioskMode(): boolean {
  return localStorage.getItem(KEY) === '1'
}

export function enterKioskMode() {
  localStorage.setItem(KEY, '1')
  window.dispatchEvent(new Event(KIOSK_EVENT))
}

export function exitKioskMode() {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(KIOSK_EVENT))
}
