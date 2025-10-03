import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function EnergyParticles({ params }) {
  const pointsRef = useRef()
  const velocitiesRef = useRef()
  const lifetimesRef = useRef()
  
  const {
    speed = 1,
    count = 100,
    direction = 1, // 1 = aufwärts (positive), -1 = spiralförmig (negative)
  } = params || {}
  
  // Initialisiere Partikel mit Eigenschaften
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const lifetimes = new Float32Array(count)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Start-Position: Zentrum mit leichter Streuung
      const radius = Math.random() * 2
      const angle = Math.random() * Math.PI * 2
      
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = -3 + Math.random() * 2 // Nahe am Ursprung
      positions[i3 + 2] = Math.sin(angle) * radius
      
      // Velocity: Abhängig von direction
      const flowSpeed = 0.02 + Math.random() * 0.03
      
      if (direction > 0) {
        // POSITIVE: Nach oben fließend
        velocities[i3] = (Math.random() - 0.5) * 0.01
        velocities[i3 + 1] = flowSpeed * speed
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01
      } else {
        // NEGATIVE: Spiralförmig abwärts
        velocities[i3] = Math.cos(angle) * flowSpeed * 0.5
        velocities[i3 + 1] = -flowSpeed * speed * 0.3
        velocities[i3 + 2] = Math.sin(angle) * flowSpeed * 0.5
      }
      
      // Lifetime: 0 = neu geboren, 1 = max Alter
      lifetimes[i] = Math.random()
      
      // Größe: Variation für Tiefe
      sizes[i] = 0.1 + Math.random() * 0.15
      
      // Farbe: Gradient basierend auf Position
      const hue = direction > 0 ? 0.5 : 0.8 // Cyan vs Purple
      const color = new THREE.Color().setHSL(hue, 0.8, 0.6)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }
    
    velocitiesRef.current = velocities
    lifetimesRef.current = lifetimes
    
    return { positions, colors, sizes }
  }, [count, speed, direction])
  
  // Animation Loop: Physik + Lifecycle
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
      
      // Update Position
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
      
      // Turbulenz-Effekt für organische Bewegung
      const turbulence = Math.sin(time * 2 + i * 0.1) * 0.005
      positions[i3] += turbulence
      positions[i3 + 2] += Math.cos(time * 2 + i * 0.1) * 0.005
      
      // Spiral-Effekt für NEGATIVE sentiment
      if (direction < 0) {
        const spiralAngle = time + i * 0.5
        const spiralRadius = Math.sqrt(
          positions[i3] ** 2 + positions[i3 + 2] ** 2
        )
        
        positions[i3] = Math.cos(spiralAngle) * spiralRadius
        positions[i3 + 2] = Math.sin(spiralAngle) * spiralRadius
      }
      
      // Lifetime Management
      lifetimes[i] += 0.005
      
      // Respawn wenn außerhalb oder zu alt
      const outOfBounds = 
        Math.abs(positions[i3 + 1]) > 8 ||
        Math.sqrt(positions[i3] ** 2 + positions[i3 + 2] ** 2) > 8 ||
        lifetimes[i] > 1
      
      if (outOfBounds) {
        // Respawn am Zentrum
        const radius = Math.random() * 1.5
        const angle = Math.random() * Math.PI * 2
        
        positions[i3] = Math.cos(angle) * radius
        positions[i3 + 1] = -3 + Math.random()
        positions[i3 + 2] = Math.sin(angle) * radius
        
        lifetimes[i] = 0
      }
      
      // Opacity basierend auf Lifetime (fade in/out)
      const life = lifetimes[i]
      let alpha = 1
      
      if (life < 0.2) {
        alpha = life / 0.2 // Fade in
      } else if (life > 0.8) {
        alpha = (1 - life) / 0.2 // Fade out
      }
      
      // Size pulsiert leicht
      sizes[i] = (0.1 + Math.random() * 0.15) * (1 + Math.sin(time * 3 + i) * 0.3)
      
      // Color shift basierend auf Höhe
      const heightFactor = (positions[i3 + 1] + 8) / 16 // 0-1
      const hue = direction > 0 
        ? 0.5 + heightFactor * 0.2 // Cyan → Blue
        : 0.8 - heightFactor * 0.1 // Purple → Magenta
      
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