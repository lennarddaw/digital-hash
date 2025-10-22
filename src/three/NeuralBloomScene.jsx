// src/three/NeuralBloomScene.jsx
import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import BloomGenerator from './BloomGenerator'
import EnergyParticles from './EnergyParticles'

export default function NeuralBloomScene({ bloomData, audioData, onInspect }) {
  const groupRef = useRef()
  const ambientLightRef = useRef()
  const pointLightRef = useRef()
  const [transitionProgress, setTransitionProgress] = useState(0)

  // Smooth transition beim Wechsel von Daten
  useEffect(() => {
    if (bloomData) setTransitionProgress(0)
  }, [bloomData])

  // Haupt-Animation Loop mit Audio-Reaktivität
  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    // Audio-Reaktivität
    const hasAudio = audioData && (audioData.bass > 0.01 || audioData.energy > 0.01)
    const bassBoost = hasAudio ? audioData.bass : 0
    const energyBoost = hasAudio ? audioData.energy : 0
    const midBoost = hasAudio ? audioData.mid : 0
    const trebleBoost = hasAudio ? audioData.treble : 0

    // Rotation: Bass beeinflusst Y-Rotation (langsamer mit Bass-Boost)
    const baseRotationSpeed = 0.05
    const rotationSpeed = baseRotationSpeed + (bassBoost * 0.15)
    groupRef.current.rotation.y = time * rotationSpeed

    // X-Rotation: Oszillation mit Mid-Frequenz-Modulation
    const baseOscillation = Math.sin(time * 0.3) * 0.1
    const midInfluence = midBoost * 0.2
    groupRef.current.rotation.x = baseOscillation + midInfluence

    // Scale: Pulsiert mit Gesamt-Energie
    const baseScale = 1
    const energyPulse = energyBoost * 0.3
    const scale = baseScale + energyPulse
    
    if (transitionProgress < 1) {
      setTransitionProgress((prev) => Math.min(prev + 0.02, 1))
      const transitionScale = THREE.MathUtils.lerp(0.5, scale, transitionProgress)
      groupRef.current.scale.setScalar(transitionScale)
    } else {
      groupRef.current.scale.setScalar(scale)
    }

    // Ambient Light: Pulsiert mit Bass
    if (ambientLightRef.current) {
      const basePulse = Math.sin(time * 2) * 0.1 + 0.3
      const audioPulse = bassBoost * 0.4
      ambientLightRef.current.intensity = basePulse + audioPulse
    }

    // Point Light: Intensität folgt Treble
    if (pointLightRef.current && bloomData) {
      const baseIntensity = bloomData.metadata?.sentiment === 'POSITIVE' ? 1.4 : 1.0
      const trebleInfluence = trebleBoost * 0.6
      pointLightRef.current.intensity = baseIntensity + trebleInfluence
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
          onInspect={onInspect}
        />

        <EnergyParticles
          params={{
            speed: 0.5,
            count: 60,
            direction: 0,
            questionFactor: 0,
            varianceFactor: 0.3,
          }}
          onInspect={onInspect}
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

  // Audio-Modulation für Energie-Partikel
  const audioSpeedBoost = audioData ? audioData.energy * 0.8 : 0
  const audioCountBoost = audioData ? Math.floor(audioData.bass * 30) : 0

  // Prüfe Token-Modus (energiegebundene Partikel pro Wort)
  const tokenMode = Array.isArray(energy?.tokens) && energy.tokens.length > 0

  return (
    <group ref={groupRef}>
      {/* Dynamisches Lighting */}
      <ambientLight ref={ambientLightRef} intensity={0.3} />

      {/* Sentiment-basiertes Point Light mit Audio-Reaktivität */}
      <pointLight
        ref={pointLightRef}
        position={[0, 2, 0]}
        color={sentimentColor}
        intensity={(isPositive ? 1.4 : 1.0) + questionFactor * 0.4}
        distance={10}
        decay={2}
      />

      {/* Haupt Neural Bloom Struktur */}
      <BloomGenerator
        params={{
          ...structure,
          meanSentenceLength: metadata?.meanSentenceLength || 10,
          topicHash: metadata?.topicHash || 1,
        }}
        onInspect={onInspect}
      />

      {/* Energie-Partikel mit Audio-Reaktivität */}
      <EnergyParticles
        params={{
          ...energy,
          speed: (energy.speed || 0.5) + audioSpeedBoost,
          count: (energy.count || 60) + audioCountBoost,
          questionFactor,
          varianceFactor,
        }}
        onInspect={onInspect}
      />

      {/* Zweite Schicht nur im Aggregatmodus */}
      {!tokenMode && (
        <EnergyParticles
          params={{
            ...energy,
            count: Math.floor((energy.count || 60) * 0.35) + audioCountBoost,
            speed: ((energy.speed || 0.5) * 0.55) + (audioSpeedBoost * 0.5),
            questionFactor,
            varianceFactor,
          }}
          onInspect={onInspect}
        />
      )}

      {/* Zentral-Core: Pulsierender Nucleus */}
      <mesh position={[0, -3, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial
          color={sentimentColor}
          emissive={sentimentColor}
          emissiveIntensity={0.5 + (audioData?.bass || 0) * 0.5}
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
          opacity={0.2 + (audioData?.mid || 0) * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Energy Ring */}
      <mesh position={[0, -3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.05, 16, 100]} />
        <meshBasicMaterial
          color={sentimentColor}
          transparent
          opacity={0.4 + (audioData?.treble || 0) * 0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Komplexitäts-/Volumen-Indikatoren */}
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
                  opacity={0.28 - i * 0.07 + (audioData?.energy || 0) * 0.15}
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
            opacity={0.05 + (audioData?.amplitude || 0) * 0.1}
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