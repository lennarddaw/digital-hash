import { lazy, Suspense } from 'react'
import '../index.css'

// Optional: Reactbits-Komponente lazy laden (falls du sie hinzufügst)
const LiquidEther = lazy(() => import('../thirdparty/LiquidEther.jsx'))

export default function BackgroundLayer({ type = 'solid-dark' }) {
  return (
    <div className="absolute inset-0 -z-10">
      {/* Default: echtes Tiefschwarz */}
      {type === 'solid-dark' && (
        <div className="w-full h-full bg-[#000000]" />
      )}

      {type === 'gradient-radial' && (
        <div
          className="w-full h-full"
          style={{
            // zarter Radial-Glow, bleibt aber auf schwarzem Grund
            background:
              'radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,1) 70%)',
          }}
        />
      )}

      {type === 'grid' && (
        <div
          className="w-full h-full relative"
          style={{ backgroundColor: '#000000' }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
      )}

      {type === 'liquid-ether' && (
        <Suspense fallback={<div className="w-full h-full bg-[#000000]" />}>
          <div className="w-full h-full">
            <LiquidEther
              mouseForce={20}
              cursorSize={100}
              isViscous={false}
              viscous={30}
              iterationsViscous={32}
              iterationsPoisson={32}
              dt={0.014}
              BFCEC
              resolution={0.5}
              isBounce={false}
              colors={['#52A7FF', '#FFF9FC', '#B19EEF']}
              autoDemo
            />
          </div>
        </Suspense>
      )}
    </div>
  )
}