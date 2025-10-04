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
  if (type === 'prism') {
    return <PrismSkybox />
  }
  if (type === 'lightning') {
    return <LightningSkybox />
  }
  return null
}

/* ---------- Liquid Ether–like shader skybox ---------- */
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

  useEffect(() => {
    if (!meshRef.current) return
    const m = meshRef.current
    m.frustumCulled = false
    m.renderOrder = -1
  }, [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    if (meshRef.current) {
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

/* ---------- Prism shader skybox ---------- */
function PrismSkybox() {
  const { camera, viewport } = useThree()
  const meshRef = useRef()

  const material = useMemo(() => {
    const H = 3.5
    const BW = 5.5
    const BASE_HALF = BW * 0.5
    const GLOW = 1.2
    const SCALE = 3.6
    const HUE = 0.8
    const CFREQ = 1.2
    const BLOOM = 1.2

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uHeight: { value: H },
      uBaseHalf: { value: BASE_HALF },
      uGlow: { value: GLOW },
      uScale: { value: SCALE },
      uHueShift: { value: HUE },
      uColorFreq: { value: CFREQ },
      uBloom: { value: BLOOM },
      uCenterShift: { value: H * 0.25 },
      uInvBaseHalf: { value: 1 / BASE_HALF },
      uInvHeight: { value: 1 / H },
      uMinAxis: { value: Math.min(BASE_HALF, H) },
      uRotX: { value: 0 },
      uRotY: { value: 0 },
      uRotZ: { value: 0 },
    }

    const vertex = /* glsl */`
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vPos = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`

    const fragment = /* glsl */`
      precision highp float;
      varying vec3 vPos;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uHeight;
      uniform float uBaseHalf;
      uniform float uGlow;
      uniform float uScale;
      uniform float uHueShift;
      uniform float uColorFreq;
      uniform float uBloom;
      uniform float uCenterShift;
      uniform float uInvBaseHalf;
      uniform float uInvHeight;
      uniform float uMinAxis;
      uniform float uRotX;
      uniform float uRotY;
      uniform float uRotZ;

      vec4 tanh4(vec4 x){
        vec4 e2x = exp(2.0*x);
        return (e2x - 1.0) / (e2x + 1.0);
      }

      float rand(vec2 co){
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float sdOctaAnisoInv(vec3 p){
        vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
        float m = q.x + q.y + q.z - 1.0;
        return m * uMinAxis * 0.5773502691896258;
      }

      float sdPyramidUpInv(vec3 p){
        float oct = sdOctaAnisoInv(p);
        float halfSpace = -p.y;
        return max(oct, halfSpace);
      }

      mat3 rotationMatrix(float yaw, float pitch, float roll) {
        float cy = cos(yaw), sy = sin(yaw);
        float cx = cos(pitch), sx = sin(pitch);
        float cz = cos(roll), sz = sin(roll);
        
        return mat3(
          cy*cz + sy*sx*sz, -cy*sz + sy*sx*cz, sy*cx,
          cx*sz, cx*cz, -sx,
          -sy*cz + cy*sx*sz, sy*sz + cy*sx*cz, cy*cx
        );
      }

      mat3 hueRotation(float a){
        float c = cos(a), s = sin(a);
        mat3 W = mat3(
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114,
          0.299, 0.587, 0.114
        );
        mat3 U = mat3(
           0.701, -0.587, -0.114,
          -0.299,  0.413, -0.114,
          -0.300, -0.588,  0.886
        );
        mat3 V = mat3(
           0.168, -0.331,  0.500,
           0.328,  0.035, -0.500,
          -0.497,  0.296,  0.201
        );
        return W + U * c + V * s;
      }

      void main(){
        vec2 screenPos = (vUv - 0.5) * 2.0;
        screenPos.x *= uResolution.x / uResolution.y;
        
        vec2 f = screenPos * (1.0 / (0.1 * uScale));
        float z = 5.0;
        float d = 0.0;
        vec3 p;
        vec4 o = vec4(0.0);
        
        float cf = uColorFreq;
        mat3 rot = rotationMatrix(uRotY, uRotX, uRotZ);
        
        const int STEPS = 60;
        for (int i = 0; i < STEPS; i++) {
          p = vec3(f, z);
          p = rot * p;
          vec3 q = p;
          q.y += uCenterShift;
          d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
          z -= d;
          o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
        }
        
        o = tanh4(o * o * (uGlow * uBloom) / 1e5);
        
        vec3 col = o.rgb;
        float n = rand(gl_FragCoord.xy + vec2(uTime)) * 0.15;
        col += (n - 0.5) * 0.3;
        col = clamp(col, 0.0, 1.0);
        
        if(abs(uHueShift) > 0.0001){
          col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
        }
        
        // Fade edges for seamless skybox
        float edgeFade = smoothstep(0.0, 0.3, min(
          min(vUv.x, 1.0 - vUv.x),
          min(vUv.y, 1.0 - vUv.y)
        ));
        col *= mix(0.7, 1.0, edgeFade);
        
        gl_FragColor = vec4(col, 1.0);
      }`

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false
    })
    return mat
  }, [])

  useEffect(() => {
    if (!meshRef.current) return
    const m = meshRef.current
    m.frustumCulled = false
    m.renderOrder = -1
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    
    // Update resolution
    material.uniforms.uResolution.value.set(
      viewport.width * viewport.dpr,
      viewport.height * viewport.dpr
    )
    
    // Animated rotation (3drotate mode)
    const wY = 0.5
    const wX = 0.4
    const wZ = 0.3
    material.uniforms.uTime.value = time
    material.uniforms.uRotY.value = time * wY * 0.4
    material.uniforms.uRotX.value = Math.sin(time * wX + 1.0) * 0.6
    material.uniforms.uRotZ.value = Math.sin(time * wZ + 2.0) * 0.5
    
    if (meshRef.current) {
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

/* ---------- Lightning shader skybox ---------- */
function LightningSkybox() {
  const { camera, viewport } = useThree()
  const meshRef = useRef()

  const material = useMemo(() => {
    const HUE = 114
    const SPEED = 0.5
    const INTENSITY = 0.1
    const SIZE = 15

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uHue: { value: HUE },
      uSpeed: { value: SPEED },
      uIntensity: { value: INTENSITY },
      uSize: { value: SIZE },
    }

    const vertex = /* glsl */`
      varying vec3 vPos;
      varying vec2 vUv;
      void main() {
        vPos = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`

    const fragment = /* glsl */`
      precision highp float;
      varying vec3 vPos;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uHue;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;

      #define OCTAVE_COUNT 10

      vec3 hsv2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z * mix(vec3(1.0), rgb, c.y);
      }

      float hash11(float p) {
        p = fract(p * .1031);
        p *= p + 33.33;
        p *= p + p;
        return fract(p);
      }

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      mat2 rotate2d(float theta) {
        float c = cos(theta);
        float s = sin(theta);
        return mat2(c, -s, s, c);
      }

      float noise(vec2 p) {
        vec2 ip = floor(p);
        vec2 fp = fract(p);
        float a = hash12(ip);
        float b = hash12(ip + vec2(1.0, 0.0));
        float c = hash12(ip + vec2(0.0, 1.0));
        float d = hash12(ip + vec2(1.0, 1.0));
        
        vec2 t = smoothstep(0.0, 1.0, fp);
        return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < OCTAVE_COUNT; ++i) {
          value += amplitude * noise(p);
          p = rotate2d(0.45) * p;
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 screenPos = (vUv - 0.5) * 2.0;
        screenPos.x *= uResolution.x / uResolution.y;
        
        vec2 uv = screenPos;
        uv += 2.0 * fbm(uv * uSize + 0.8 * uTime * uSpeed) - 1.0;
        
        float dist = abs(uv.x);
        vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
        vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(uTime * uSpeed)) / dist, 1.0) * uIntensity;
        col = pow(col, vec3(1.0));
        
        // Fade edges for seamless skybox
        float edgeFade = smoothstep(0.0, 0.2, min(
          min(vUv.x, 1.0 - vUv.x),
          min(vUv.y, 1.0 - vUv.y)
        ));
        col *= mix(0.5, 1.0, edgeFade);
        
        gl_FragColor = vec4(col, 1.0);
      }`

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false
    })
    return mat
  }, [])

  useEffect(() => {
    if (!meshRef.current) return
    const m = meshRef.current
    m.frustumCulled = false
    m.renderOrder = -1
  }, [])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    
    // Update resolution
    material.uniforms.uResolution.value.set(
      viewport.width * viewport.dpr,
      viewport.height * viewport.dpr
    )
    
    material.uniforms.uTime.value = time
    
    if (meshRef.current) {
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
        alpha: false,
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: true
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