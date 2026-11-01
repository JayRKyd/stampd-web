// Renders the gift card (the ribbon design) to a PNG so the email shows the
// real card, pixel for pixel, in every mail client. SVG → PNG with resvg.

import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2'

const W = 1080
const H = Math.round(W * 0.68)
const PAD = 36

let wasmReady: Promise<void> | null = null
let fontsReady: Promise<Uint8Array[]> | null = null

async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm')
      .then(r => r.arrayBuffer())
      .then(buf => initWasm(buf))
  }
  return wasmReady
}

// Plus Jakarta Sans, the app's typeface, pulled once from Google Fonts
async function ensureFonts(): Promise<Uint8Array[]> {
  if (!fontsReady) {
    fontsReady = (async () => {
      const css = await fetch('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap', {
        headers: { 'User-Agent': 'Mozilla/4.0' }, // old UA → Google serves plain TTF urls
      }).then(r => r.text())
      const urls = [...css.matchAll(/url\((https:[^)]+\.ttf)\)/g)].map(m => m[1])
      const unique = [...new Set(urls)]
      const buffers = await Promise.all(unique.map(u => fetch(u).then(r => r.arrayBuffer()).then(b => new Uint8Array(b))))
      if (buffers.length === 0) throw new Error('fonts_unavailable')
      return buffers
    })()
  }
  return fontsReady
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function shade(hex: string, factor: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * factor), g = Math.round(((n >> 8) & 255) * factor), b = Math.round((n & 255) * factor)
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

// Two-line wrap by character budget; the note is short by design
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine && cur) {
      lines.push(cur.trim())
      cur = w
      if (lines.length === maxLines) break
    } else cur = (cur + ' ' + w).trim()
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'
  }
  return lines
}

async function logoDataUri(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? 'image/png'
    const buf = new Uint8Array(await res.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return `data:${type};base64,${btoa(bin)}`
  } catch {
    return null
  }
}

export async function renderCardPng(p: {
  business_name: string; logo_url: string | null; card_color: string
  for_name: string | null; from_name: string | null; note: string | null; amount_cents: number
}): Promise<Uint8Array> {
  await ensureWasm()
  const fonts = await ensureFonts()
  const logo = await logoDataUri(p.logo_url)

  const c1 = /^#[0-9a-fA-F]{6}$/.test(p.card_color) ? p.card_color : '#00605A'
  const c2 = shade(c1, 0.72)
  const shop = esc(p.business_name)
  const who = [p.for_name ? `FOR ${esc(p.for_name).toUpperCase()}` : '', p.from_name ? `FROM ${esc(p.from_name).toUpperCase()}` : ''].filter(Boolean).join('  ·  ')
  const noteLines = p.note ? wrap(`“${p.note}”`, 44, 2) : []
  const initials = esc(p.business_name.slice(0, 2).toUpperCase())

  // vertical layout, same proportions as the app card: head at the top,
  // the amount as the hero around the middle, note under it, footer pinned
  const yHead = PAD + 44
  const yAmount = 360
  const yWho = yAmount + 50
  const yNote = yWho + 62
  const yFoot = H - PAD - 8

  const noteSvg = noteLines.length
    ? `<rect x="${PAD}" y="${yNote - 28}" width="6" height="${noteLines.length * 38 + 6}" rx="3" fill="#d4a843"/>` +
      noteLines.map((l, i) => `<text x="${PAD + 26}" y="${yNote + i * 38}" font-size="27" font-weight="400" fill="rgba(255,255,255,0.92)">${esc(l)}</text>`).join('')
    : ''

  const logoSvg = logo
    ? `<image href="${logo}" x="${PAD + 9}" y="${PAD + 9}" width="78" height="78" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${PAD + 48}" y="${PAD + 62}" font-size="34" font-weight="800" fill="${c1}" text-anchor="middle">${initials}</text>`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Plus Jakarta Sans">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <radialGradient id="glow" cx="92%" cy="6%" r="60%"><stop offset="0" stop-color="#d4a843" stop-opacity="0.3"/><stop offset="1" stop-color="#d4a843" stop-opacity="0"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9cd74"/><stop offset="0.55" stop-color="#d4a843"/><stop offset="1" stop-color="#c09a35"/></linearGradient>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="44"/></clipPath>
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <g transform="translate(${W - 172} 124) rotate(45)">
      <rect x="-300" y="-46" width="600" height="92" fill="url(#gold)"/>
      <text x="0" y="16" font-size="44" font-weight="800" fill="#0C2E29" text-anchor="middle" letter-spacing="13">GIFT</text>
    </g>
  </g>
  <rect x="${PAD}" y="${PAD}" width="96" height="96" rx="28" fill="#F7F2E8"/>
  ${logoSvg}
  <text x="${PAD + 118}" y="${yHead + 2}" font-size="40" font-weight="800" fill="#ffffff">${shop}</text>
  <text x="${PAD + 118}" y="${yHead + 38}" font-size="27" font-weight="400" fill="rgba(255,255,255,0.7)">Gift card</text>
  <text x="${PAD - 4}" y="${yAmount}" font-size="104" font-weight="800" fill="#ffffff" letter-spacing="-4">${money(p.amount_cents)}</text>
  ${who ? `<text x="${PAD}" y="${yWho}" font-size="22" font-weight="700" fill="rgba(255,255,255,0.8)" letter-spacing="2.5">${who}</text>` : ''}
  ${noteSvg}
  <text x="${PAD}" y="${yFoot}" font-size="20" font-weight="700" fill="rgba(255,255,255,0.5)" letter-spacing="2">GIFT CARD  ·  ${shop.toUpperCase()} ONLY</text>
  <text x="${W - PAD}" y="${yFoot}" font-size="20" font-weight="700" fill="rgba(255,255,255,0.5)" letter-spacing="2" text-anchor="end">STAMPD</text>
</svg>`

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontBuffers: fonts, defaultFontFamily: 'Plus Jakarta Sans', loadSystemFonts: false },
  })
  return resvg.render().asPng()
}
