'use client'
import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 900, trigger = true): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>()
  const prevTarget = useRef(0)

  useEffect(() => {
    if (!trigger) return
    const from = prevTarget.current
    prevTarget.current = target
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setValue(target)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, trigger, duration])

  return value
}
