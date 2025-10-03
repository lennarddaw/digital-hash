// src/three/NeuralBloomScene.jsx
import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BloomGenerator from './BloomGenerator'
import EnergyParticles from './EnergyParticles'

export default function NeuralBloomScene({ bloomData }) {
  const groupRef = useRef()
  const ambientLightRef = useRef()
  const [transitionProgress, setTransitionProgress] = useState(0)

  // Smooth transition beim Wechsel von Daten
  useEffect(() => {
    if (bloomData) setTransitionProgress(0)
  }, [bloomData])

  // Haupt-Animation Loop
  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    // Sanfte Rotation der gesamten Szene
    groupRef.current.rotation.y = time * 0.05
    // Leichte Oszillation für lebendigen Effekt
    groupRef.current.rotation.x = Math.sin(time * 0.3) * 0.1

    // Transition-Animation
    if (transitionProgress < 1) {
      setTransitionProgress((prev) => Math.min(prev + 0.02, 1))
      const scale = THREE.MathUtils.lerp(0.5, 1, transitionProgress)
      groupRef.current.scale.setScalar(scale)
    }

    // Ambient Light pulsiert leicht
    if (ambientLightRef.current) {
      const pulse = Math.sin(time * 2) * 0.1 + 0.3
      ambientLightRef.current.intensity = pulse
    }
  })

  // Idle State: Kein Text
  if (!bloomData) {
    return (
      <group ref={groupRef}>
        <ambientLight ref={ambientLightRef} intensity={0.3} />

        <BloomGenerator
          params={{
            branches: 6,
            complexity: 3,
            symmetry: 0.8,
            angle: 25,
            color: '#00d4ff',
            meanSentenceLength: 10,
            topicHash: 1,
            rings: [],
            nodes: [],
            links: [],
            highlights: [],
          }}
        />

        <EnergyParticles
          params={{
            speed: 0.5,
            count: 60,
            direction: 0,
            questionFactor: 0,
            varianceFactor: 0.3,
          }}
        />

        {/* Zentrale Glow-Sphäre */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial
            color="#00d4ff"
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Orbit-Ring als visueller Rahmen */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5, 0.02, 16, 100]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.2} />
        </mesh>
      </group>
    )
  }

  // Active State: Text analysiert
  const { structure, energy, metadata } = bloomData

  const sentimentColor = structure?.color || '#00d4ff'
  const isPositive = metadata?.sentiment === 'POSITIVE'

  // Ableitungen für erklärbare Parameter
  const questionFactor = Math.min(1, metadata?.questionScore || 0)
  const varianceFactor = Math.min(
    1,
    Math.sqrt(metadata?.varianceSentenceLength || 0) / 10
  )

  // Prüfe Token-Modus (energiegebundene Partikel pro Wort)
  const tokenMode = Array.isArray(energy?.tokens) && energy.tokens.length > 0

  return (
    <group ref={groupRef}>
      {/* Dynamisches Lighting */}
      <ambientLight ref={ambientLightRef} intensity={0.3} />

      {/* Sentiment-basiertes Point Light mit Frage-getriebener Modulation */}
      <pointLight
        position={[0, 2, 0]}
        color={sentimentColor}
        intensity={(isPositive ? 1.4 : 1.0) + questionFactor * 0.4}
        distance={10}
        decay={2}
      />

      {/* Haupt Neural Bloom Struktur
          - rendert L-System-Basis + Satz-Ringe + Token-Nodes/Links/Highlights */}
      <BloomGenerator
        params={{
          ...structure,
          meanSentenceLength: metadata?.meanSentenceLength || 10,
          topicHash: metadata?.topicHash || 1,
        }}
      />

      {/* Energie-Partikel:
          - Token-Modus: jedes Partikel repräsentiert ein Wort (aus energy.tokens)
          - Fallback: aggregierte Partikel (count/speed/direction) */}
      <EnergyParticles
        params={{
          ...energy,
          questionFactor,
          varianceFactor,
        }}
      />
      {/* Zweite Schicht nur im Aggregatmodus (für Tiefe/Dichte).
          Im Token-Modus vermeiden wir Doppelung, da tokens bereits alle Wörter abdecken. */}
      {!tokenMode && (
        <EnergyParticles
          params={{
            ...energy,
            count: Math.floor(energy.count * 0.35),
            speed: energy.speed * 0.55,
            questionFactor,
            varianceFactor,
          }}
        />
      )}

      {/* Zentral-Core: Pulsierender Nucleus */}
      <mesh position={[0, -3, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={sentimentColor}
          emissive={sentimentColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Inner Glow Sphere */}
      <mesh position={[0, -3, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial
          color={sentimentColor}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Energy Ring */}
      <mesh position={[0, -3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.05, 16, 100]} />
        <meshBasicMaterial
          color={sentimentColor}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Komplexitäts-/Volumen-Indikatoren: Ringe aus Wortzahl & Satzlänge */}
      {metadata?.wordCount > 30 && (
        <>
          {[...Array(Math.min(4, Math.floor(metadata.wordCount / 60)))].map(
            (_, i) => (
              <mesh
                key={i}
                position={[0, -3 + i * 1.2, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <torusGeometry
                  args={[
                    2 + i * 0.45 + (metadata.meanSentenceLength || 10) * 0.02,
                    0.02,
                    16,
                    100,
                  ]}
                />
                <meshBasicMaterial
                  color={sentimentColor}
                  transparent
                  opacity={0.28 - i * 0.07}
                />
              </mesh>
            )
          )}
        </>
      )}

      {/* Sentiment-Confidence Halo */}
      {metadata?.confidence > 0.8 && (
        <mesh position={[0, -3, 0]}>
          <sphereGeometry args={[3, 32, 32]} />
          <meshBasicMaterial
            color={sentimentColor}
            transparent
            opacity={0.05}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Grid-Boden für räumliche Orientierung */}
      <gridHelper
        args={[20, 20, sentimentColor, '#1a1a2e']}
        position={[0, -8, 0]}
        material-opacity={0.2}
        material-transparent
      />
    </group>
  )
}