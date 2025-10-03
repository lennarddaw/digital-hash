// src/components/BloomCanvas.jsx
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import NeuralBloomScene from '../three/NeuralBloomScene.jsx'

/** Erhöht die Trefferzone für sehr kleine Geometrien (Points/Lines). */
function RaycastTuning() {
  const { raycaster } = useThree()
  // Schwellen (in Weltkoordinaten, wirkt wie „Pick-Radius“)
  raycaster.params.Points = { threshold: 0.2 }
  raycaster.params.Line = { threshold: 0.2 }
  raycaster.params.LineSegments = { threshold: 0.2 }
  return null
}

export default function BloomCanvas({ bloomData, onInspect }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 15], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0a0e27']} />

      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      <RaycastTuning />

      <NeuralBloomScene bloomData={bloomData} onInspect={onInspect} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
      />

      <Environment preset="night" />
    </Canvas>
  )
}