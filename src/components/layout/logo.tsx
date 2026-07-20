import { cn } from '@/lib/utils/cn'

interface LogoProps {
  variant?: 'dark' | 'light'
  className?: string
  showTagline?: boolean
}

// Typographic recreation of the Tech Plus Consulting wordmark using the
// brand's Graduate display font, in the navy/gold brand palette.
export function Logo({ variant = 'dark', className, showTagline = true }: LogoProps) {
  const primaryText = variant === 'light' ? 'text-white' : 'text-[#1e3a5f]'

  return (
    <div className={cn('inline-flex flex-col leading-none', className)}>
      <div className="flex items-baseline gap-1">
        <span className={cn('font-extrabold tracking-tight text-2xl', primaryText)}>TECH</span>
        <span className="font-display text-2xl text-[#d6a419]">PLUS</span>
      </div>
      {showTagline && (
        <span className={cn('font-display text-[11px] tracking-[0.25em] uppercase mt-1', primaryText)}>
          Consulting
        </span>
      )}
    </div>
  )
}
