import type { CSSProperties, HTMLAttributes } from 'react'

export type DotAnimationResolver = (args: { row: number; col: number; phase: 'idle' | 'active' }) => { className?: string; style?: CSSProperties }
export type DotMatrixCommonProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  size?: number
  dotSize?: number
  speed?: number
  animated?: boolean
  hoverAnimated?: boolean
  color?: string
}

type BaseProps = DotMatrixCommonProps & {
  pattern?: 'full'
  phase: 'idle' | 'active'
  reducedMotion: boolean
  animationResolver: DotAnimationResolver
}

export function isWithinCircularMask(row: number, col: number) {
  const x = col - 2
  const y = row - 2
  return Math.sqrt(x * x + y * y) <= 2.35
}

export function DotMatrixBase({ size = 36, dotSize = 5, color = 'currentColor', phase, animationResolver, reducedMotion: _reducedMotion, pattern: _pattern, speed: _speed, animated: _animated, hoverAnimated: _hoverAnimated, style, ...props }: BaseProps) {
  const gap = Math.max(2, (size - dotSize * 5) / 4)
  return <div aria-hidden="true" style={{ width: size, height: size, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap, color, ...style }} {...props}>
    {Array.from({ length: 25 }, (_, index) => {
      const row = Math.floor(index / 5)
      const col = index % 5
      const resolved = animationResolver({ row, col, phase })
      return <span key={index} className={resolved.className} style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: 'currentColor', alignSelf: 'center', justifySelf: 'center', transition: 'opacity 90ms linear', ...resolved.style }} />
    })}
  </div>
}
