import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function BloomGenerator({ params }) {
  const groupRef = useRef()
  const materialRef = useRef()
  
  // Generiere Bloom-Struktur mit verbessertem L-System
  const { geometry, glowGeometry } = useMemo(() => {
    const {
      branches = 5,
      complexity = 3,
      symmetry = 0.8,
      angle = 25,
      color = '#00d4ff'
    } = params || {}
    
    const points = []
    const glowPoints = []
    
    // Rekursive Branching-Funktion mit mehr Details
    function createBranch(pos, dir, depth, thickness, energy) {
      if (depth === 0) return
      
      // Branch-Länge nimmt mit Tiefe ab
      const length = (2 + energy * 0.5) / Math.pow(depth, 0.7)
      const end = pos.clone().add(dir.clone().multiplyScalar(length))
      
      // Haupt-Branch
      points.push(pos, end)
      
      // Glow-Punkte für Energie-Visualisierung
      const steps = Math.max(3, Math.floor(length * 5))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const glowPos = new THREE.Vector3().lerpVectors(pos, end, t)
        glowPos.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ))
        glowPoints.push(glowPos)
      }
      
      // Berechne Sub-Branches mit mehr Variation
      const branchCount = depth > 1 ? 2 : 1
      const angleRad = (angle * Math.PI) / 180
      
      for (let i = 0; i < branchCount; i++) {
        // Variation in der Rotation für organischeres Aussehen
        const rotationAxis = new THREE.Vector3(
          Math.random() - 0.5,
          1,
          Math.random() - 0.5
        ).normalize()
        
        const branchAngle = angleRad * (i === 0 ? 1 : -symmetry)
        const branchDir = dir.clone().applyAxisAngle(rotationAxis, branchAngle)
        
        // Leichte Störung für Natürlichkeit
        branchDir.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.2
        )).normalize()
        
        createBranch(
          end,
          branchDir,
          depth - 1,
          thickness * 0.7,
          energy * 0.9
        )
      }
    }
    
    // Erstelle mehrere Haupt-Branches von Zentrum
    const center = new THREE.Vector3(0, -3, 0)
    const baseDir = new THREE.Vector3(0, 1, 0)
    
    for (let i = 0; i < branches; i++) {
      const rotAngle = (i * Math.PI * 2) / branches
      const mainDir = baseDir.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotAngle
      )
      
      // Kleine Störung für jede Hauptrichtung
      mainDir.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        0,
        (Math.random() - 0.5) * 0.3
      )).normalize()
      
      createBranch(center, mainDir, complexity, 1, 1)
    }
    
    return {
      geometry: new THREE.BufferGeometry().setFromPoints(points),
      glowGeometry: new THREE.BufferGeometry().setFromPoints(glowPoints)
    }
  }, [params])
  
  // Animation: Pulse-Effekt basierend auf Sentiment
  useFrame((state) => {
    if (groupRef.current && materialRef.current) {
      const time = state.clock.elapsedTime
      
      // Sanfte Rotation
      groupRef.current.rotation.y = time * 0.1
      
      // Pulsierender Glow
      const pulse = Math.sin(time * 2) * 0.3 + 0.7
      materialRef.current.opacity = 0.6 + pulse * 0.2
      
      // Leichte Auf-Ab-Bewegung
      groupRef.current.position.y = Math.sin(time * 0.5) * 0.2
    }
  })
  
  const baseColor = new THREE.Color(params?.color || '#00d4ff')
  
  return (
    <group ref={groupRef}>
      {/* Haupt-Struktur mit Glow */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          ref={materialRef}
          color={baseColor}
          linewidth={2}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      
      {/* Glow-Partikel an den Verbindungen */}
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
      
      {/* Zusätzliche Glow-Sphären an wichtigen Knotenpunkten */}
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