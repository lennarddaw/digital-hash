// src/three/EnergyParticles.jsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Visualisiert "Energie" aus dem Text:
 * - direction:  1 = aufwärts (positiv), -1 = spiral abwärts (negativ), 0 = schwebend (neutral)
 * - speed:      aus Sentiment/Betonung
 * - count:      aus Wortanzahl (geclamped)
 * - questionFactor: 0..1 Oszillation/Flackern (Frage-Intensität)
 * - varianceFactor: 0..1 Größenstreuung (Satzlängen-Varianz)
 */
export default function EnergyParticles({ params }) {
  const pointsRef = useRef()
  const velocitiesRef = useRef()
  const lifetimesRef = useRef()

  const {
    speed = 1,
    count = 100,
    direction = 1,        // 1=aufwärts, -1=spiral abwärts, 0=schwebend
    questionFactor = 0,   // 0..1 -> Oszillation (Fragezeichen)
    varianceFactor = 0.5, // 0..1 -> Größenstreuung (Varianz Satzlänge)
  } = params || {}

  // Initialisierung der Partikel
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const lifetimes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Start-Position: ringförmig um den Ursprung mit leichter Streuung
      const radius = Math.random() * 2
      const angle = Math.random() * Math.PI * 2
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = -3 + Math.random() * 2
      positions[i3 + 2] = Math.sin(angle) * radius

      // Velocity abhängig von direction
      const flow = 0.02 + Math.random() * 0.03
      if (direction > 0) {
        // POSITIV: aufwärts mit leichtem Drift
        velocities[i3] = (Math.random() - 0.5) * 0.01
        velocities[i3 + 1] = flow * speed
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01
      } else if (direction < 0) {
        // NEGATIV: spiralig, leicht abwärts
        velocities[i3] = Math.cos(angle) * flow * 0.5
        velocities[i3 + 1] = -flow * speed * 0.3
        velocities[i3 + 2] = Math.sin(angle) * flow * 0.5
      } else {
        // NEUTRAL: schwebend, Brown'sche Bewegung
        velocities[i3] = (Math.random() - 0.5) * 0.02
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
      }

      // Lebenszeit & Größe
      lifetimes[i] = Math.random()
      sizes[i] = 0.1 + Math.random() * (0.15 + 0.2 * varianceFactor)

      // Grundfarbe per Richtung (HSL):
      //  pos: Cyan/Blau, neg: Purpur/Magenta, neu: kühles Blaugrün
      const baseHue = direction > 0 ? 0.5 : direction < 0 ? 0.8 : 0.62
      const color = new THREE.Color().setHSL(baseHue, 0.8, 0.6)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }

    velocitiesRef.current = velocities
    lifetimesRef.current = lifetimes
    return { positions, colors, sizes }
  }, [count, speed, direction, varianceFactor])

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

      // Spiralform nur für negative Richtung
      if (direction < 0) {
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
        const radius = Math.random() * 1.5
        const angle = Math.random() * Math.PI * 2
        positions[i3] = Math.cos(angle) * radius
        positions[i3 + 1] = -3 + Math.random()
        positions[i3 + 2] = Math.sin(angle) * radius
        lifetimes[i] = 0
      }

      // Alpha/Größe: sanftes Ein-/Ausfaden und Frage-getriebene Pulsation
      const life = lifetimes[i]
      let alpha = 1
      if (life < 0.2) alpha = life / 0.2
      else if (life > 0.8) alpha = (1 - life) / 0.2

      const sizeBase = 0.1 + Math.random() * (0.15 + 0.2 * varianceFactor)
      const pulse = Math.sin(time * (3 + questionFactor * 4) + i) * 0.3
      sizes[i] = sizeBase * (1 + pulse)

      // Farbverlauf: Höhe + Richtung beeinflussen Hue; neutral oszilliert leicht
      const heightFactor = (positions[i3 + 1] + 8) / 16 // 0..1
      const hue =
        direction > 0
          ? 0.5 + heightFactor * 0.2
          : direction < 0
          ? 0.8 - heightFactor * 0.1
          : 0.62 + Math.sin(time * 0.5 + i * 0.01) * 0.05

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
    <points ref={pointsRef}>
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
        opacity={0.8}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}