// src/three/EnergyParticles.jsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Visualisiert "Energie" aus dem Text.
 *
 * Zwei Betriebsarten:
 * 1) Aggregiert (wie bisher)
 *    - direction:  1 = aufwärts (positiv), -1 = spiral abwärts (negativ), 0 = schwebend (neutral)
 *    - speed:      aus Sentiment/Betonung
 *    - count:      aus Wortanzahl (geclamped)
 *    - questionFactor: 0..1 Oszillation/Flackern (Frage-Intensität)
 *    - varianceFactor: 0..1 Größenstreuung (Satzlängen-Varianz)
 *
 * 2) Token-Modus (feingranular, wenn params.tokens vorhanden)
 *    - tokens: [{ tokenIdx, size, speed, hueBias, direction }]
 *      -> JEDES Partikel repräsentiert ein Wort/Token
 *      -> Größe ∝ Wortlänge, Speed ∝ Salience, Hue-Bias ∝ Token-Typ
 */
export default function EnergyParticles({ params }) {
  const pointsRef = useRef()
  const velocitiesRef = useRef()
  const lifetimesRef = useRef()

  const {
    // Aggregierte Parameter (Fallback)
    speed = 1,
    count: fallbackCount = 100,
    direction = 1,        // 1=aufwärts, -1=spiral abwärts, 0=schwebend
    questionFactor = 0,   // 0..1 -> Oszillation (Fragezeichen)
    varianceFactor = 0.5, // 0..1 -> Größenstreuung (Varianz Satzlänge)

    // Token-Modus
    tokens = null,        // optional: Array aus bloomMapper.energy.tokens
  } = params || {}

  const tokenMode = Array.isArray(tokens) && tokens.length > 0
  const count = tokenMode ? tokens.length : fallbackCount

  // Deterministisches RNG (für gleichbleibende Startpositionen)
  function rngFromSeed(seed) {
    let s = (seed >>> 0) || 1
    return () => {
      s = (1664525 * s + 1013904223) >>> 0
      return s / 4294967296
    }
  }

  // Initialisierung der Partikel
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const lifetimes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    // Basis-Hue über globale Richtung
    const baseHueGlobal = direction > 0 ? 0.5 : direction < 0 ? 0.8 : 0.62

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Startpositionen: ringförmig + Streuung
      let radius, angle, localDir, localSpeed, hueBias, baseHue
      if (tokenMode) {
        const tok = tokens[i]
        const seed = (tok?.tokenIdx ?? i) + 1
        const rng = rngFromSeed(seed)
        radius = 1 + (rng() * 1.5) // kompaktere Startwolke je Token
        angle = rng() * Math.PI * 2
        localDir =
          typeof tok.direction === 'number' ? tok.direction : direction
        localSpeed = (tok?.speed ?? 1) * Math.max(0.4, speed)
        hueBias = clamp(tok?.hueBias ?? 0, -0.15, 0.15)
        baseHue = clamp(baseHueGlobal + hueBias, 0, 1)
        sizes[i] = Math.max(0.06, tok?.size ?? 0.12)
      } else {
        radius = Math.random() * 2
        angle = Math.random() * Math.PI * 2
        localDir = direction
        localSpeed = speed
        hueBias = 0
        baseHue = baseHueGlobal
        sizes[i] = 0.1 + Math.random() * (0.15 + 0.2 * varianceFactor)
      }

      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = -3 + Math.random() * (tokenMode ? 1.2 : 2)
      positions[i3 + 2] = Math.sin(angle) * radius

      // Velocity abhängig von Richtung
      const flow = 0.02 + Math.random() * 0.03
      if (localDir > 0) {
        // POSITIV: aufwärts mit leichtem Drift
        velocities[i3] = (Math.random() - 0.5) * 0.01
        velocities[i3 + 1] = flow * localSpeed
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01
      } else if (localDir < 0) {
        // NEGATIV: spiralig, leicht abwärts
        velocities[i3] = Math.cos(angle) * flow * 0.5
        velocities[i3 + 1] = -flow * localSpeed * 0.3
        velocities[i3 + 2] = Math.sin(angle) * flow * 0.5
      } else {
        // NEUTRAL: schwebend, Brown'sche Bewegung
        velocities[i3] = (Math.random() - 0.5) * 0.02
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
      }

      // Lebenszeit
      lifetimes[i] = Math.random()

      // Farbe per Richtung + optionalem Hue-Bias (Token-Typen)
      const color = new THREE.Color().setHSL(baseHue, 0.8, 0.6)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }

    velocitiesRef.current = velocities
    lifetimesRef.current = lifetimes
    return { positions, colors, sizes }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, speed, direction, varianceFactor, tokenMode])

  // Animation / Update-Loop
  useFrame((state) => {
    if (!pointsRef.current) return

    const positions = pointsRef.current.geometry.attributes.position.array
    const colors = pointsRef.current.geometry.attributes.color.array
    const sizes = pointsRef.current.geometry.attributes.size.array
    const velocities = velocitiesRef.current
    const lifetimes = lifetimesRef.current

    const time = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Positionsupdate
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]

      // Turbulenz: stärker bei hohen questionFactor-Werten
      const turbFreq = 2 + questionFactor * 3
      const turbulence = Math.sin(time * turbFreq + i * 0.1) * 0.005
      positions[i3] += turbulence
      positions[i3 + 2] += Math.cos(time * turbFreq + i * 0.1) * 0.005

      // Spiralform nur für negative Richtung (globaler Modus)
      if (!tokenMode && direction < 0) {
        const spiralAngle = time + i * 0.5
        const spiralRadius = Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2)
        positions[i3] = Math.cos(spiralAngle) * spiralRadius
        positions[i3 + 2] = Math.sin(spiralAngle) * spiralRadius
      }

      // Lebenszeit & Respawn
      lifetimes[i] += 0.005
      const outOfBounds =
        Math.abs(positions[i3 + 1]) > 8 ||
        Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2) > 8 ||
        lifetimes[i] > 1

      if (outOfBounds) {
        // Token-gebunden: deterministischer Re-Spawn um das Zentrum
        if (tokenMode) {
          const tok = tokens[i]
          const rng = rngFromSeed((tok?.tokenIdx ?? i) + 1337)
          const radius = 0.8 + rng() * 1.6
          const ang = rng() * Math.PI * 2
          positions[i3] = Math.cos(ang) * radius
          positions[i3 + 1] = -3 + rng() * 1.2
          positions[i3 + 2] = Math.sin(ang) * radius
        } else {
          const radius = Math.random() * 1.5
          const ang = Math.random() * Math.PI * 2
          positions[i3] = Math.cos(ang) * radius
          positions[i3 + 1] = -3 + Math.random()
          positions[i3 + 2] = Math.sin(ang) * radius
        }
        lifetimes[i] = 0
      }

      // Alpha/Größe: sanftes Ein-/Ausfaden und Frage-getriebene Pulsation
      const life = lifetimes[i]
      let alpha = 1
      if (life < 0.2) alpha = life / 0.2
      else if (life > 0.8) alpha = (1 - life) / 0.2

      const sizeBase = tokenMode
        ? sizes[i] // Token-Größe bleibt deterministisch
        : 0.1 + Math.random() * (0.15 + 0.2 * varianceFactor)

      const pulse = Math.sin(time * (3 + questionFactor * 4) + i) * 0.3
      sizes[i] = sizeBase * (1 + pulse)

      // Farbverlauf: Höhe + (ggf. lokale Richtung) beeinflussen Hue
      const heightFactor = (positions[i3 + 1] + 8) / 16 // 0..1
      let hue
      if (tokenMode) {
        const tok = tokens[i]
        const localDir =
          typeof tok?.direction === 'number' ? tok.direction : direction
        const baseHue = localDir > 0 ? 0.5 : localDir < 0 ? 0.8 : 0.62
        const hueBias = clamp(tok?.hueBias ?? 0, -0.15, 0.15)
        const base = clamp(baseHue + hueBias, 0, 1)
        hue =
          localDir > 0
            ? base + heightFactor * 0.15
            : localDir < 0
            ? base - heightFactor * 0.08
            : base + Math.sin(time * 0.5 + i * 0.01) * 0.05
      } else {
        hue =
          direction > 0
            ? 0.5 + heightFactor * 0.2
            : direction < 0
            ? 0.8 - heightFactor * 0.1
            : 0.62 + Math.sin(time * 0.5 + i * 0.01) * 0.05
      }

      const color = new THREE.Color().setHSL(hue, 0.7, 0.5 + alpha * 0.3)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true
    pointsRef.current.geometry.attributes.color.needsUpdate = true
    pointsRef.current.geometry.attributes.size.needsUpdate = true
  })

  return (
    <points ref={pointsRef} key={`points-${count}-${tokenMode ? 'tok' : 'agg'}`}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particleData.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particleData.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        transparent
        opacity={0.85}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* --------------- helpers --------------- */
function clamp(x, min, max) { return Math.max(min, Math.min(max, x)) }