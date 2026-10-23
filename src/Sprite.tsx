/** Pixel-art image that renders nothing when the data has no picture */
export function Sprite({
  src,
  className,
  alt = '',
}: {
  src: string | null | undefined
  className?: string
  alt?: string
}) {
  if (!src) return null
  return <img className={className ? `sprite ${className}` : 'sprite'} src={src} alt={alt} loading="lazy" />
}
