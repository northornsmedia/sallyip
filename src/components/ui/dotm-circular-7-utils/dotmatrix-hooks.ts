import { useCallback, useEffect, useState } from 'react'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update(); query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}

export function useDotMatrixPhases({ animated, hoverAnimated }: { animated: boolean; hoverAnimated: boolean; speed: number }) {
  const [hovered, setHovered] = useState(false)
  return {
    phase: (animated || (hoverAnimated && hovered) ? 'active' : 'idle') as 'idle' | 'active',
    onMouseEnter: useCallback(() => setHovered(true), []),
    onMouseLeave: useCallback(() => setHovered(false), []),
  }
}

export function useCyclePhase({ active, cycleMsBase, speed }: { active: boolean; cycleMsBase: number; speed: number }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!active) { setPhase(0); return }
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => { setPhase((((now - started) * speed) % cycleMsBase) / cycleMsBase); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, cycleMsBase, speed])
  return phase
}
