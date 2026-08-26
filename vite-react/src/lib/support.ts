// Central support/contact config. Set these in your .env for production; if a
// value is missing the related link is hidden rather than pointing at a dead "#".

export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || 'infoteam@ryknotechsolutions.com'
// Digits only, incl. country code, e.g. 12421234567. Intentionally NO default:
// the owner's number stays off the public site unless explicitly enabled via env.
export const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.trim() || ''

// Both stores are live (2026-08): real listings as defaults so the download
// buttons never render "Coming soon" when env vars are absent.
export const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim() || 'https://apps.apple.com/us/app/stampd-bahamas/id6791025505'
export const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || 'https://play.google.com/store/apps/details?id=com.stampdbahamas.app'

export const supportEmailHref = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : ''
export const whatsappHref = SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}` : ''

// Best available "Contact us" target: prefer email, fall back to WhatsApp.
export const contactHref = supportEmailHref || whatsappHref
