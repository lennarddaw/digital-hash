import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import NeuralBloomScene from '../three/NeuralBloomScene'

export default function BloomCanvas({ bloomData }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={['#0a0e27']} />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <NeuralBloomScene bloomData={bloomData} />
      
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