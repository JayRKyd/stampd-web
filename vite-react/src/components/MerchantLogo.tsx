import { cn } from '@/lib/utils'

/** Full-bleed card background — covers the card, centered crop. */
export function MerchantLogoBackground({ src }: { src: string }) {
  return (
    <>
      <img
        src={src}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/38" />
    </>
  )
}

/** Fixed-size badge — entire logo visible regardless of aspect ratio. */
export function MerchantLogoBadge({
  src,
  alt = 'Logo',
  size = 40,
  className,
}: {
  src: string
  alt?: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/90 p-1',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  )
}
