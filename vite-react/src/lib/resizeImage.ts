// Downscale images in the browser before upload. Merchants upload straight
// from their camera roll — multi-MB originals that every customer's phone
// would otherwise download. PNG stays PNG (logo transparency survives);
// everything else becomes JPEG.

interface ResizeOptions {
  // Logos often arrive as a small mark floating in a large white/transparent
  // canvas (export-with-margins from Canva etc.), which renders tiny in the
  // app's square tiles. Trimming crops to the visible content first, so the
  // logo fills the frame. Never use for cover photos.
  trimWhitespace?: boolean
}

// Bounding box of non-white, non-transparent pixels, with a small margin so
// the crop doesn't kiss the artwork. Returns null when trimming wouldn't
// meaningfully change the image (already tight, or nothing detectable).
function contentBounds(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = ctx.getImageData(0, 0, width, height)
  let minX = width, minY = height, maxX = -1, maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a < 16) continue // transparent — background
      if (data[i] > 245 && data[i + 1] > 245 && data[i + 2] > 245) continue // white-ish
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) return null // blank image — leave it alone

  const margin = Math.round(Math.max(width, height) * 0.04)
  const bx = Math.max(0, minX - margin)
  const by = Math.max(0, minY - margin)
  const bw = Math.min(width, maxX + margin + 1) - bx
  const bh = Math.min(height, maxY + margin + 1) - by

  // Under 10% saved on both axes — the crop isn't worth a recompress
  if (bw > width * 0.9 && bh > height * 0.9) return null
  return { bx, by, bw, bh }
}

export async function resizeImage(file: File, maxDim = 512, opts: ResizeOptions = {}): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Trim pass runs at natural size so thin artwork isn't lost to scaling
    let source: HTMLCanvasElement | ImageBitmap = bitmap
    let srcW = width
    let srcH = height
    if (opts.trimWhitespace) {
      const probe = document.createElement('canvas')
      probe.width = width
      probe.height = height
      const pctx = probe.getContext('2d', { willReadFrequently: true })
      if (pctx) {
        pctx.drawImage(bitmap, 0, 0)
        const bounds = contentBounds(pctx, width, height)
        if (bounds) {
          const cropped = document.createElement('canvas')
          cropped.width = bounds.bw
          cropped.height = bounds.bh
          const cctx = cropped.getContext('2d')
          if (cctx) {
            cctx.drawImage(bitmap, bounds.bx, bounds.by, bounds.bw, bounds.bh, 0, 0, bounds.bw, bounds.bh)
            source = cropped
            srcW = bounds.bw
            srcH = bounds.bh
          }
        }
      }
    }

    const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
    // Already small enough and untrimmed — don't recompress for nothing
    if (scale === 1 && source === bitmap && file.size < 400 * 1024) {
      bitmap.close()
      return file
    }

    const w = Math.max(1, Math.round(srcW * scale))
    const h = Math.max(1, Math.round(srcH * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(source, 0, 0, w, h)
    bitmap.close()

    const isPng = file.type === 'image/png'
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : 0.85)
    )
    if (!blob) return file

    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const base = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${base}.${ext}`, { type: blob.type })
  } catch {
    // Unsupported format or decode failure — upload the original rather than block
    return file
  }
}
