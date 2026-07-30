interface BrandPatternProps {
  id: string
  className?: string
  color?: string
  opacity?: number
}

// Tiled backdrop combining the brand guide's "topographic lines" and
// "network nodes" motifs, used as a subtle background element (guide
// section 6: Visual Language). Rendered as a single repeating SVG pattern
// so it stays cheap regardless of container size.
export function BrandPattern({ id, className, color = '#ffffff', opacity = 0.08 }: BrandPatternProps) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width="220" height="220" patternUnits="userSpaceOnUse">
          {/* topographic contour lines */}
          <path
            d="M-20 40 C 30 10, 70 70, 120 40 S 210 10, 260 40"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={opacity}
          />
          <path
            d="M-20 90 C 20 130, 80 50, 130 90 S 220 130, 260 90"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={opacity * 0.8}
          />
          <path
            d="M-20 160 C 40 190, 60 130, 110 160 S 200 190, 260 160"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity={opacity * 0.6}
          />
          {/* network nodes */}
          <g stroke={color} strokeWidth="1" opacity={opacity * 1.4}>
            <line x1="30" y1="20" x2="70" y2="55" />
            <line x1="70" y1="55" x2="55" y2="110" />
            <line x1="55" y1="110" x2="20" y2="140" />
            <line x1="150" y1="30" x2="185" y2="70" />
            <line x1="185" y1="70" x2="170" y2="130" />
            <line x1="170" y1="130" x2="200" y2="180" />
          </g>
          <g fill={color} opacity={opacity * 1.8}>
            <circle cx="30" cy="20" r="2.5" />
            <circle cx="70" cy="55" r="2.5" />
            <circle cx="55" cy="110" r="2.5" />
            <circle cx="20" cy="140" r="2.5" />
            <circle cx="150" cy="30" r="2.5" />
            <circle cx="185" cy="70" r="2.5" />
            <circle cx="170" cy="130" r="2.5" />
            <circle cx="200" cy="180" r="2.5" />
          </g>
          {/* plus symbols */}
          <g stroke={color} strokeWidth="1.5" opacity={opacity * 1.2} strokeLinecap="round">
            <path d="M110 200 v10 M105 205 h10" />
            <path d="M10 70 v8 M6 74 h8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
