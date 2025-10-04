// src/components/LoadingState.jsx
import { useEffect, useRef, useState } from 'react'

/**
 * Weißer Progress-Balken für initiales Modell-Laden.
 * - Indeterministisch: füllt weich bis ~90% und „snapt“ dann regelmäßig ein wenig nach.
 * - Unmountet sauber, sobald die Modelle geladen sind (Komponente wird von App.jsx entfernt).
 * - Barrierefrei via role="progressbar".
 */
function WhiteProgressBar({ label = 'Loading AI models...' }) {
  const [value, setValue] = useState(0) // 0..100
  const rafRef = useRef(0)
  const tRef = useRef(0)

  useEffect(() => {
    const step = (t) => {
      const dt = Math.min(50, t - tRef.current) || 16
      tRef.current = t
      setValue((prev) => {
        // bis 90% schneller, danach langsameres „Wippen“
        const target = prev < 90 ? 90 : 97
        const k = prev < 90 ? 0.015 : 0.004 // easing
        const next = prev + (target - prev) * (1 - Math.exp(-k * dt))
        return Math.min(99, next)
      })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="mt-4 w-full max-w-md">
      <div className="mb-1 text-xs tracking-wide text-gray-200/90">{label} (first time only)</div>
      <div
        className="h-2.5 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.14)' }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        role="progressbar"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: '#ffffff',
            boxShadow: '0 0 16px rgba(255,255,255,0.6)',
            transition: 'width 120ms linear',
          }}
        />
      </div>
    </div>
  )
}

export default function LoadingState({ type }) {
  if (type === 'model') {
    // Weißer Balken anstelle des Spinners
    return <WhiteProgressBar label="Loading AI models" />
  }

  // Fallback: bisheriger Analyse-Spinner
  const messages = {
    analysis: 'Analyzing your text...',
  }

  return (
    <div className="mt-4 flex items-center gap-3 text-cyan-400">
      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <span>{messages[type] ?? 'Loading...'}</span>
    </div>
  )
}