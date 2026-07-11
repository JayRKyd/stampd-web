// Downscale images in the browser before upload. Merchants upload straight
// from their camera roll — multi-MB originals that every customer's phone
// would otherwise download. PNG stays PNG (logo transparency survives);
// everything else becomes JPEG.

export async function resizeImage(file: File, maxDim = 512): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    const scale = Math.min(1, maxDim / Math.max(width, height))
    // Already small enough — don't recompress for nothing
    if (scale === 1 && file.size < 400 * 1024) {
      bitmap.close()
      return file
    }

    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
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
