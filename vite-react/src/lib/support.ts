// Central support/contact config. Set these in your .env for production; if a
// value is missing the related link is hidden rather than pointing at a dead "#".

export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || 'infoteam@ryknotechsolutions.com'
// Digits only, incl. country code, e.g. 12421234567. Intentionally NO default:
// the owner's number stays off the public site unless explicitly enabled via env.
export const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.trim() || ''

// Both stores ARE live (2026-08), but the public launch is deliberately held
// back until founding merchants are signed — "Coming soon" stays until then.
// To flip the site to launch mode, set VITE_APP_STORE_URL and
// VITE_PLAY_STORE_URL in Vercel (or hardcode the listings here):
//   https://apps.apple.com/us/app/stampd-bahamas/id6791025505
//   https://play.google.com/store/apps/details?id=com.stampdbahamas.app
export const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim() || ''
export const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || ''

export const supportEmailHref = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : ''
export const whatsappHref = SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}` : ''

// Best available "Contact us" target: prefer email, fall back to WhatsApp.
export const contactHref = supportEmailHref || whatsappHref
