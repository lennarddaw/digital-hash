// src/three/BloomGenerator.jsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function BloomGenerator({ params }) {
  const groupRef = useRef()
  const materialRef = useRef()

  // Deterministische Zufallsquelle aus topicHash
  function makeRng(seed) {
    // LCG – stabil, schnell, ausreichend für visuelles Rauschen
    let s = (seed >>> 0) || 1
    return () => {
      s = (1664525 * s + 1013904223) >>> 0
      return s / 4294967296
    }
  }

  // Generiere Bloom-Struktur mit deterministischem Rauschen
  const { geometry, glowGeometry } = useMemo(() => {
    const {
      branches = 5,
      complexity = 3,
      symmetry = 0.8,
      angle = 25,
      color = '#00d4ff',
      meanSentenceLength = 10, // steuert sichtbare Dicke (weiter unten)
      topicHash = 1,           // Seed für reproduzierbare Abweichungen
    } = params || {}

    const rng = makeRng(topicHash || 1)

    const points = []
    const glowPoints = []

    // Rekursive Branching-Funktion (L-System-ähnlich)
    function createBranch(pos, dir, depth, thickness, energy) {
      if (depth === 0) return

      // Branch-Länge nimmt mit Tiefe ab; kleine Energie-Komponente
      const length = (2 + energy * 0.5) / Math.pow(depth, 0.7)
      const end = pos.clone().add(dir.clone().multiplyScalar(length))

      // Haupt-Branch (als Liniensegment)
      points.push(pos, end)

      // Glow-Punkte entlang des Segments (leichte deterministische Störung)
      const steps = Math.max(3, Math.floor(length * 5))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const glowPos = new THREE.Vector3().lerpVectors(pos, end, t)
        glowPos.add(
          new THREE.Vector3((rng() - 0.5) * 0.1, (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.1)
        )
        glowPoints.push(glowPos)
      }

      // Sub-Branches: abhängig von Tiefe 1–2 Verzweigungen
      const branchCount = depth > 1 ? 2 : 1
      const angleRad = (angle * Math.PI) / 180

      for (let i = 0; i < branchCount; i++) {
        // Rotationsachse mit deterministischer Variation
        const rotationAxis = new THREE.Vector3(
          rng() - 0.5,
          1,
          rng() - 0.5
        ).normalize()

        const branchAngle = angleRad * (i === 0 ? 1 : -symmetry)
        const branchDir = dir.clone().applyAxisAngle(rotationAxis, branchAngle)

        // Leichte Störung für organischeres Aussehen
        branchDir
          .add(new THREE.Vector3((rng() - 0.5) * 0.2, (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.2))
          .normalize()

        createBranch(end, branchDir, depth - 1, thickness * 0.7, energy * 0.9)
      }
    }

    // Hauptäste vom Zentrum
    const center = new THREE.Vector3(0, -3, 0)
    const baseDir = new THREE.Vector3(0, 1, 0)

    for (let i = 0; i < branches; i++) {
      const rotAngle = (i * Math.PI * 2) / branches
      const mainDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotAngle)

      // deterministische Störung je Hauptast
      mainDir
        .add(new THREE.Vector3((rng() - 0.5) * 0.3, 0, (rng() - 0.5) * 0.3))
        .normalize()

      createBranch(center, mainDir, complexity, 1, 1)
    }

    return {
      geometry: new THREE.BufferGeometry().setFromPoints(points),
      glowGeometry: new THREE.BufferGeometry().setFromPoints(glowPoints),
    }
  }, [params])

  // Animation: leichte Rotation, Puls und Schweben
  useFrame((state) => {
    if (groupRef.current && materialRef.current) {
      const time = state.clock.elapsedTime
      groupRef.current.rotation.y = time * 0.1
      const pulse = Math.sin(time * 2) * 0.3 + 0.7
      materialRef.current.opacity = 0.6 + pulse * 0.2
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.2
    }
  })

  const baseColor = new THREE.Color(params?.color || '#00d4ff')
  const lineWidth = Math.max(1.5, Math.min(4, (params?.meanSentenceLength || 10) / 8))

  return (
    <group ref={groupRef}>
      {/* Haupt-Struktur */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          ref={materialRef}
          color={baseColor}
          linewidth={lineWidth}     // Hinweis: Browser können linewidth ignorieren, dient aber als Intent
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Glow-Partikel entlang der Verbindungen */}
      <points geometry={glowGeometry}>
        <pointsMaterial
          size={0.15}
          color={baseColor}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* Zentraler Knoten-Glow */}
      <mesh position={[0, -3, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}