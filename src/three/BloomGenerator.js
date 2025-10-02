import { useMemo } from 'react'
import * as THREE from 'three'

export default function BloomGenerator({ params }) {
  const geometry = useMemo(() => {
    // L-System basierte Geometrie-Generierung
    const points = []
    const { branches = 5, complexity = 3, symmetry = 0.8 } = params
    
    // Einfacher rekursiver Baum-Algorithmus
    function branch(pos, dir, depth, angle) {
      if (depth === 0) return
      
      const length = 2 / depth
      const end = pos.clone().add(dir.clone().multiplyScalar(length))
      
      points.push(pos, end)
      
      // Verzweigungen
      const leftDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), angle)
      const rightDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -angle * symmetry)
      
      branch(end, leftDir, depth - 1, angle * 0.8)
      branch(end, rightDir, depth - 1, angle * 0.8)
    }
    
    // Start von unten
    const startPos = new THREE.Vector3(0, -5, 0)
    const startDir = new THREE.Vector3(0, 1, 0)
    const angle = (25 * Math.PI) / 180
    
    for (let i = 0; i < branches; i++) {
      const rotatedDir = startDir.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (i * Math.PI * 2) / branches
      )
      branch(startPos, rotatedDir, complexity, angle)
    }
    
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [params])
  
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial 
        color={params.color || '#00d4ff'} 
        linewidth={2}
        transparent
        opacity={0.8}
      />
    </lineSegments>
  )
}