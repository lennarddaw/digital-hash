// src/components/BackgroundSelector.jsx
import { useEffect, useMemo, useRef, useState } from 'react'

const OPTIONS = [
  { value: 'solid-dark', label: 'Solid (Deep Black)', preview: 'solid' },
  { value: 'gradient-radial', label: 'Radial Gradient', preview: 'radial' },
  { value: 'grid', label: 'Subtle Grid', preview: 'grid' },
  { value: 'liquid-ether', label: 'Liquid Ether', preview: 'ether' },
]

export default function BackgroundSelector({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const listRef = useRef(null)

  const current = useMemo(
    () => OPTIONS.find(o => o.value === value) ?? OPTIONS[0],
    [value]
  )

  // Close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (!open) return
      const t = e.target
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (!open) return
      const idx = OPTIONS.findIndex(o => o.value === value)
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
      else if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = OPTIONS[(idx + 1) % OPTIONS.length]
        onChange(next.value)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length]
        onChange(prev.value)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, value, onChange])

  return (
    <div className={`relative inline-block ${className}`}>
      <label className="block text-sm text-gray-300 mb-1">Background:</label>

      {/* trigger */}
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === ' ') {
            e.preventDefault(); setOpen(true)
          }
        }}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 hover:bg-white/10 text-white px-3 py-2 backdrop-blur-md transition-colors focus:outline-none"
      >
        <PreviewSwatch type={current.preview} />
        <span className="text-sm">{current.label}</span>
        <svg
          className={`ml-2 h-4 w-4 opacity-80 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/>
        </svg>
      </button>

      {/* dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#0b0f1a]/90 backdrop-blur-md shadow-2xl ring-1 ring-black/5 overflow-hidden"
          role="listbox"
          tabIndex={-1}
        >
          {OPTIONS.map((opt) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={active}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm transition-colors
                  ${active ? 'bg-white/10 text-white' : 'text-gray-200 hover:bg-white/6'}
                `}
                onClick={() => { onChange(opt.value); setOpen(false); btnRef.current?.focus(); }}
              >
                <PreviewSwatch type={opt.preview} />
                <div className="flex-1">{opt.label}</div>
                {active && (
                  <svg className="h-4 w-4 opacity-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-7.01 7.01a1 1 0 01-1.414 0L3.296 8.736a1 1 0 111.414-1.414l4.012 4.012 6.303-6.302a1 1 0 011.42 0z" clipRule="evenodd"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* --- tiny preview squares for each background type --- */
function PreviewSwatch({ type }) {
  const common = 'h-6 w-6 rounded-md border border-white/15 shrink-0'
  if (type === 'solid') {
    return <span className={`${common}`} style={{ background: '#000' }} />
  }
  if (type === 'radial') {
    return (
      <span
        className={common}
        style={{
          background:
            'radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,0.12) 0%, rgba(0,0,0,1) 70%)'
        }}
      />
    )
  }
  if (type === 'grid') {
    return (
      <span
        className={common + ' relative'}
        style={{ backgroundColor: '#000' }}
      >
        <span
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '8px 8px'
          }}
        />
      </span>
    )
  }
  // ether
  return (
    <span
      className={common}
      style={{
        background:
          'conic-gradient(from 210deg at 50% 50%, #52A7FF, #FFF9FC, #B19EEF, #52A7FF 90%)'
      }}
    />
  )
}