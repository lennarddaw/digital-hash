// src/components/BloomCanvas.jsx
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import NeuralBloomScene from '../three/NeuralBloomScene.jsx'
import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/* ---------- Generated textures for non-shader backgrounds ---------- */
function useRadialGradientTexture() {
  return useMemo(() => {
    const size = 1024
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    const g = ctx.createRadialGradient(size*0.5, size*0.4, size*0.1, size*0.5, size*0.4, size*0.6)
    g.addColorStop(0, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function useGridTexture() {
  return useMemo(() => {
    const size = 1024, step = 40
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, size); ctx.stroke()
    }
    for (let y = 0; y <= size; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(size, y + 0.5); ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

/* ---------- Background switch (true scene background) ---------- */
function InSceneBackground({ type }) {
  const { scene } = useThree()
  const radialTex = useRadialGradientTexture()
  const gridTex = useGridTexture()

  useEffect(() => {
    const prev = scene.background
    if (type === 'solid-dark') {
      scene.background = new THREE.Color('#000000')
    } else if (type === 'gradient-radial') {
      scene.background = radialTex
    } else if (type === 'grid') {
      scene.background = gridTex
    } else {
      // shader skybox rendert selbst
      scene.background = null
    }
    return () => { scene.background = prev ?? null }
  }, [type, scene, radialTex, gridTex])

  if (type === 'liquid-ether') {
    return <LiquidEtherSkybox />
  }
  return null
}

/* ---------- Liquid Ether–like shader skybox (fixed) ---------- */
function LiquidEtherSkybox() {
  const { camera } = useThree()
  const meshRef = useRef()

  const material = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#52A7FF') },
      uColor2: { value: new THREE.Color('#FFF9FC') },
      uColor3: { value: new THREE.Color('#B19EEF') },
      uIntensity: { value: 0.8 },
      uScale: { value: 1.2 },
    }
    const vertex = /* glsl */`
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`
    const fragment = /* glsl */`
      precision highp float;
      varying vec3 vPos;
      uniform float uTime;
      uniform vec3 uColor1, uColor2, uColor3;
      uniform float uIntensity, uScale;
      float hash(vec3 p){ p=fract(p*.3183099+vec3(.1,.2,.3)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 p){
        vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        float n000=hash(i+vec3(0,0,0)), n100=hash(i+vec3(1,0,0));
        float n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
        float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1));
        float n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
        float n00=mix(n000,n100,f.x), n10=mix(n010,n110,f.x);
        float n01=mix(n001,n101,f.x), n11=mix(n011,n111,f.x);
        float n0=mix(n00,n10,f.y), n1=mix(n01,n11,f.y);
        return mix(n0,n1,f.z);
      }
      float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.; a*=.55;} return v;}
      void main(){
        vec3 p = normalize(vPos) * uScale;
        float t = uTime * .05;
        float n = fbm(p + vec3(t*2.0, t*1.3, -t*1.7));
        float m = fbm(p*1.7 + vec3(-t*1.1, t*1.9, t*1.2));
        float b1 = smoothstep(.2,.8,n);
        float b2 = smoothstep(.3,.9,m);
        vec3 col = mix(uColor1, uColor2, b1);
        col = mix(col, uColor3, b2*.75);
        float edge = smoothstep(1.5, 0.0, length(p.xy));
        col *= mix(.9, 1.2, edge);
        col = mix(vec3(0.0), col, uIntensity);
        gl_FragColor = vec4(col, 1.0);
      }`
    const mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: vertex, fragmentShader: fragment,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
    })
    return mat
  }, [])

  // WICHTIG: an Kamera „anheften“ + zuerst rendern
  useEffect(() => {
    if (!meshRef.current) return
    const m = meshRef.current
    m.frustumCulled = false
    m.renderOrder = -1 // zuerst
  }, [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    if (meshRef.current) {
      // immer um die Kamera herum platzieren, keine Parallaxe
      meshRef.current.position.copy(camera.position)
      meshRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <mesh ref={meshRef} scale={200}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ---------- Raycast tuning ---------- */
function RaycastTuning() {
  const { raycaster } = useThree()
  useEffect(() => {
    raycaster.params.Points = { threshold: 0.2 }
    raycaster.params.Line = { threshold: 0.2 }
    raycaster.params.LineSegments = { threshold: 0.2 }
  }, [raycaster])
  return null
}

/* ---------- Canvas ---------- */
function BloomCanvasBase({
  bloomData,
  onInspect,
  enableControls = true,
  bgType = 'solid-dark',
}) {
  const camera = useMemo(
    () => ({ position: [0, 0, 15], fov: 45, near: 0.1, far: 200 }),
    []
  )

  return (
    <Canvas
      dpr={[1, 2]}
      camera={camera}
      gl={{
        antialias: true,
        alpha: false,                 // Hintergrund kommt aus der Szene
        preserveDrawingBuffer: true, // Export
        logarithmicDepthBuffer: true // (optional) bessere Z-Präzision
      }}
      shadows={false}
    >
      <InSceneBackground type={bgType} />

      <ambientLight intensity={0.25} />
      <pointLight position={[10, 10, 10]} intensity={0.6} />
      <pointLight position={[-10, -5, -5]} intensity={0.3} />

      <RaycastTuning />

      <NeuralBloomScene bloomData={bloomData} onInspect={onInspect} />

      {enableControls && (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={5}
          maxDistance={60}
          enablePan={false}
        />
      )}

      <Environment preset="night" background={false} />
    </Canvas>
  )
}

export default memo(BloomCanvasBase)