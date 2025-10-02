import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import BloomGenerator from './BloomGenerator'
import EnergyParticles from './EnergyParticles'

export default function NeuralBloomScene({ bloomData }) {
  const groupRef = useRef()
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001
    }
  })
  
  if (!bloomData) {
    // Default idle state
    return (
      <group ref={groupRef}>
        <BloomGenerator params={{
          branches: 5,
          complexity: 3,
          symmetry: 0.8,
          color: '#00d4ff'
        }} />
      </group>
    )
  }
  
  return (
    <group ref={groupRef}>
      <BloomGenerator params={bloomData.structure} />
      <EnergyParticles params={bloomData.energy} />
    </group>
  )
}