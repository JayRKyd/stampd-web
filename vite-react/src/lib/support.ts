// Central support/contact config. Set these in your .env for production; if a
// value is missing the related link is hidden rather than pointing at a dead "#".

export const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || ''
// Digits only, incl. country code, e.g. 12421234567
export const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined)?.trim() || ''

export const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim() || ''
export const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || ''

export const supportEmailHref = SUPPORT_EMAIL ? `mailto:${SUPPORT_EMAIL}` : ''
export const whatsappHref = SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}` : ''

// Best available "Contact us" target: prefer email, fall back to WhatsApp.
export const contactHref = supportEmailHref || whatsappHref
