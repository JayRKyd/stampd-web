// Mirrors the mobile app's StampCard color math exactly, so web previews
// show what customers actually see. Keep in lockstep with
// coral-mobile/components/StampCard.tsx.

/** Multiply a hex color toward black; factor 1 = unchanged, 0 = black. */
export function shade(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.round(((num >> 16) & 0xff) * factor)
  const g = Math.round(((num >> 8) & 0xff) * factor)
  const b = Math.round((num & 0xff) * factor)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** True when the brand color is light enough to need dark text on it. */
export function isLightColor(hex: string): boolean {
  const num = parseInt(hex.replace('#', ''), 16)
  const brightness = (0.299 * ((num >> 16) & 0xff) + 0.587 * ((num >> 8) & 0xff) + 0.114 * (num & 0xff)) / 255
  return brightness > 0.45
}
