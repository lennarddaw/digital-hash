// src/three/BloomGenerator.jsx - MEGA VARIATIONEN
import { useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function BloomGenerator({ params, onInspect }) {
  const groupRef = useRef()
  const baseLineMatRef = useRef()
  const instRef = useRef()

  const {
    branches = 5,
    complexity = 3,
    symmetry = 0.8,
    angle = 25,
    color = '#00d4ff',
    meanSentenceLength = 10,
    topicHash = 1,
    rings = [],
    nodes = [],
    links = [],
    highlights = [],
    geometryWeights = {}, // NEUE: Mehrere Geometrien mit Weights
    nodeLayout = 'circular',
    morphFactor = 0,
    twistFactor = 0,
    fragmentationLevel = 0,
  } = params || {}

  function makeRng(seed) {
    let s = (seed >>> 0) || 1
    return () => {
      s = (1664525 * s + 1013904223) >>> 0
      return s / 4294967296
    }
  }
  const rng = makeRng(topicHash || 1)

  const CENTER_Y = -3
  
  function polarToCartesian(radius, theta, tilt = 0, heightOffset = 0) {
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius
    const v = new THREE.Vector3(x, heightOffset, z)
    v.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
    v.y += CENTER_Y
    return v
  }

  /* =========================
     1) ALLE GEOMETRIEN GENERIEREN (Hybrid-System)
     ========================= */
  const { allGeometries, baseColor } = useMemo(() => {
    const baseColor = new THREE.Color(color || '#00d4ff')
    const center = new THREE.Vector3(0, CENTER_Y, 0)
    const angleRadGlobal = (angle * Math.PI) / 180
    
    const allGeometries = {}

    // ============ TREE (L-System) ============
    if ((geometryWeights.tree || 0) > 0.05) {
      const points = []
      const glowPoints = []

      function createBranch(pos, dir, depth, energy) {
        if (depth === 0) return
        const length = (2 + energy * 0.5) / Math.pow(depth, 0.7)
        const end = pos.clone().add(dir.clone().multiplyScalar(length))
        points.push(pos, end)
        
        const steps = Math.max(3, Math.floor(length * 5))
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const g = new THREE.Vector3().lerpVectors(pos, end, t)
          g.add(new THREE.Vector3((rng() - 0.5) * 0.08, (rng() - 0.5) * 0.08, (rng() - 0.5) * 0.08))
          glowPoints.push(g)
        }
        
        const branchCount = depth > 1 ? 2 : 1
        for (let i = 0; i < branchCount; i++) {
          const rotationAxis = new THREE.Vector3(rng() - 0.5, 1, rng() - 0.5).normalize()
          const branchAngle = angleRadGlobal * (i === 0 ? 1 : -symmetry)
          const branchDir = dir.clone().applyAxisAngle(rotationAxis, branchAngle)
          branchDir.add(new THREE.Vector3((rng() - 0.5) * 0.2, (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.2)).normalize()
          createBranch(end, branchDir, depth - 1, energy * 0.9)
        }
      }

      const baseDir = new THREE.Vector3(0, 1, 0)
      for (let i = 0; i < branches; i++) {
        const rotAngle = (i * Math.PI * 2) / branches
        const mainDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotAngle)
        mainDir.add(new THREE.Vector3((rng() - 0.5) * 0.3, 0, (rng() - 0.5) * 0.3)).normalize()
        createBranch(center, mainDir, complexity, 1)
      }

      allGeometries.tree = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.tree,
      }
    }

    // ============ SPIRAL ============
    if ((geometryWeights.spiral || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const turns = 4 + Math.floor(complexity * 0.5)
      const height = 8
      const maxRadius = 3
      const segments = 200
      
      for (let i = 0; i < segments; i++) {
        const t = i / segments
        const theta = t * Math.PI * 2 * turns
        const r = maxRadius * (0.3 + t * 0.7)
        const y = CENTER_Y + (t - 0.5) * height
        const p = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r)
        if (i > 0) points.push(points[points.length - 1], p)
        glowPoints.push(p)
        if (i % 10 === 0) {
          const inner = p.clone().multiplyScalar(0.3)
          points.push(inner, p)
        }
      }

      allGeometries.spiral = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.spiral,
      }
    }

    // ============ FRACTAL ============
    if ((geometryWeights.fractal || 0) > 0.05) {
      const points = []
      const glowPoints = []
      
      function createCrystal(pos, size, depth) {
        if (depth === 0 || size < 0.1) return
        const dirs = [
          new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
          new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
        ]
        dirs.forEach((dir, i) => {
          const len = size * (0.8 + rng() * 0.4)
          const end = pos.clone().add(dir.clone().multiplyScalar(len))
          points.push(pos, end)
          for (let j = 0; j <= 5; j++) {
            const t = j / 5
            const g = new THREE.Vector3().lerpVectors(pos, end, t)
            glowPoints.push(g)
          }
          if (i < 3) createCrystal(end, size * 0.6, depth - 1)
        })
      }
      
      createCrystal(center, 2, Math.min(4, complexity))

      allGeometries.fractal = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.fractal,
      }
    }

    // ============ HELIX ============
    if ((geometryWeights.helix || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const turns = 5
      const height = 10
      const radius = 1.5
      const segments = 150
      
      for (let i = 0; i < segments; i++) {
        const t = i / segments
        const theta = t * Math.PI * 2 * turns
        const y = CENTER_Y + (t - 0.5) * height
        const p1 = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius)
        const p2 = new THREE.Vector3(Math.cos(theta + Math.PI) * radius, y, Math.sin(theta + Math.PI) * radius)
        if (i > 0) {
          points.push(points[points.length - 4], p1)
          points.push(points[points.length - 3], p2)
        }
        glowPoints.push(p1, p2)
        if (i % 8 === 0) points.push(p1, p2)
      }

      allGeometries.helix = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.helix,
      }
    }

    // ============ ORGANIC ============
    if ((geometryWeights.organic || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const tendrils = branches
      const flowHeight = 7
      const waveFreq = 3
      
      for (let t = 0; t < tendrils; t++) {
        const baseAngle = (t / tendrils) * Math.PI * 2
        const segments = 80
        let prevPoint = center.clone()
        
        for (let i = 0; i < segments; i++) {
          const s = i / segments
          const h = CENTER_Y + (s - 0.5) * flowHeight
          const r = 0.5 + s * 2
          const wave = Math.sin(s * Math.PI * waveFreq) * 0.8
          const theta = baseAngle + wave + s * 0.5
          const p = new THREE.Vector3(Math.cos(theta) * r, h, Math.sin(theta) * r)
          points.push(prevPoint, p)
          if (i % 2 === 0) glowPoints.push(p)
          prevPoint = p
        }
      }

      allGeometries.organic = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.organic,
      }
    }

    // ============ GEOMETRIC ============
    if ((geometryWeights.geometric || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const layers = Math.min(5, complexity)
      const baseSize = 2.5
      
      for (let layer = 0; layer < layers; layer++) {
        const size = baseSize * (1 - layer * 0.15)
        const y = CENTER_Y + (layer - layers/2) * 1.2
        const sides = 6 + layer * 2
        const rotation = layer * 0.3
        
        for (let i = 0; i <= sides; i++) {
          const t1 = (i / sides) * Math.PI * 2 + rotation
          const t2 = ((i + 1) / sides) * Math.PI * 2 + rotation
          const p1 = new THREE.Vector3(Math.cos(t1) * size, y, Math.sin(t1) * size)
          const p2 = new THREE.Vector3(Math.cos(t2) * size, y, Math.sin(t2) * size)
          points.push(p1, p2)
          glowPoints.push(p1)
          
          if (layer > 0) {
            const prevSize = baseSize * (1 - (layer-1) * 0.15)
            const prevY = CENTER_Y + ((layer-1) - layers/2) * 1.2
            const prevP = new THREE.Vector3(Math.cos(t1) * prevSize, prevY, Math.sin(t1) * prevSize)
            points.push(p1, prevP)
          }
        }
      }

      allGeometries.geometric = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.geometric,
      }
    }

    // ============ WEB/NETWORK ============
    if ((geometryWeights.web || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const webNodes = []
      const nodeCount = Math.min(30, branches * 5)
      
      // Create network nodes
      for (let i = 0; i < nodeCount; i++) {
        const r = 1 + rng() * 2.5
        const theta = rng() * Math.PI * 2
        const phi = (rng() - 0.5) * Math.PI * 0.8
        const p = new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * r,
          CENTER_Y + Math.sin(phi) * r,
          Math.sin(theta) * Math.cos(phi) * r
        )
        webNodes.push(p)
        glowPoints.push(p)
      }
      
      // Connect nodes
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          if (webNodes[i].distanceTo(webNodes[j]) < 2 && rng() > 0.6) {
            points.push(webNodes[i], webNodes[j])
          }
        }
      }

      allGeometries.web = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.web,
      }
    }

    // ============ TORNADO ============
    if ((geometryWeights.tornado || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const strands = 8
      const height = 10
      const segments = 100
      
      for (let s = 0; s < strands; s++) {
        const offset = (s / strands) * Math.PI * 2
        for (let i = 0; i < segments; i++) {
          const t = i / segments
          const y = CENTER_Y + (t - 0.5) * height
          const r = (1 - t) * 3 + 0.3
          const theta = t * Math.PI * 8 + offset
          const p = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r)
          if (i > 0) points.push(points[points.length - 1], p)
          if (i % 3 === 0) glowPoints.push(p)
        }
      }

      allGeometries.tornado = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.tornado,
      }
    }

    // ============ MOLECULAR ============
    if ((geometryWeights.molecular || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const clusters = Math.min(8, Math.floor(branches * 1.5))
      
      for (let c = 0; c < clusters; c++) {
        const clusterCenter = new THREE.Vector3(
          (rng() - 0.5) * 4,
          CENTER_Y + (rng() - 0.5) * 4,
          (rng() - 0.5) * 4
        )
        const atoms = 5 + Math.floor(rng() * 5)
        const atomPositions = []
        
        for (let a = 0; a < atoms; a++) {
          const r = 0.3 + rng() * 0.5
          const theta = rng() * Math.PI * 2
          const phi = rng() * Math.PI
          const p = clusterCenter.clone().add(new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.cos(phi) * r,
            Math.sin(phi) * Math.sin(theta) * r
          ))
          atomPositions.push(p)
          glowPoints.push(p)
        }
        
        for (let a = 0; a < atoms; a++) {
          for (let b = a + 1; b < atoms; b++) {
            if (rng() > 0.5) points.push(atomPositions[a], atomPositions[b])
          }
        }
      }

      allGeometries.molecular = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.molecular,
      }
    }

    // ============ CONSTELLATION ============
    if ((geometryWeights.constellation || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const stars = Math.min(40, branches * 6)
      const starPositions = []
      
      for (let i = 0; i < stars; i++) {
        const r = 2 + rng() * 3
        const theta = rng() * Math.PI * 2
        const phi = (rng() - 0.5) * Math.PI
        const p = new THREE.Vector3(
          Math.cos(theta) * Math.cos(phi) * r,
          CENTER_Y + Math.sin(phi) * r * 1.5,
          Math.sin(theta) * Math.cos(phi) * r
        )
        starPositions.push(p)
        glowPoints.push(p)
      }
      
      // Sparse connections
      for (let i = 0; i < stars; i++) {
        const nearbyCount = Math.min(3, Math.floor(rng() * 4))
        const distances = starPositions
          .map((p, idx) => ({ idx, dist: p.distanceTo(starPositions[i]) }))
          .sort((a, b) => a.dist - b.dist)
        
        for (let j = 1; j < nearbyCount; j++) {
          points.push(starPositions[i], starPositions[distances[j].idx])
        }
      }

      allGeometries.constellation = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.constellation,
      }
    }

    // ============ MANDALA ============
    if ((geometryWeights.mandala || 0) > 0.05) {
      const points = []
      const glowPoints = []
      const petals = 12
      const layers = 5
      
      for (let layer = 0; layer < layers; layer++) {
        const r = 0.8 + layer * 0.5
        const y = CENTER_Y + (layer - layers / 2) * 0.3
        
        for (let petal = 0; petal < petals; petal++) {
          const angle1 = (petal / petals) * Math.PI * 2
          const angle2 = ((petal + 1) / petals) * Math.PI * 2
          
          const p1 = new THREE.Vector3(Math.cos(angle1) * r, y, Math.sin(angle1) * r)
          const p2 = new THREE.Vector3(Math.cos(angle2) * r, y, Math.sin(angle2) * r)
          
          points.push(p1, p2)
          glowPoints.push(p1)
          
          // Radial spokes
          const center = new THREE.Vector3(0, y, 0)
          points.push(center, p1)
          
          // Decorative arcs
          const mid = new THREE.Vector3().lerpVectors(p1, p2, 0.5)
          mid.setLength(r * 1.2)
          mid.y = y
          points.push(p1, mid)
          points.push(mid, p2)
        }
      }

      allGeometries.mandala = {
        lines: new THREE.BufferGeometry().setFromPoints(points),
        glow: new THREE.BufferGeometry().setFromPoints(glowPoints),
        opacity: geometryWeights.mandala,
      }
    }

    return { allGeometries, baseColor }
  }, [branches, complexity, symmetry, angle, color, topicHash, geometryWeights])

  /* =====================================
     2) VIELFÄLTIGE RING-GEOMETRIEN
     ===================================== */
  const ringMeshesData = useMemo(() => {
    return (rings || []).map((r) => {
      const type = r.type || 'torus'
      const segments = r.segments || 64
      const amplitude = r.amplitude || 0.05
      const frequency = r.frequency || 4
      
      let geometry
      
      if (type === 'zigzag') {
        // AGGRESSIVES Zickzack für Fragen
        const points = []
        const seg = frequency * 4
        for (let i = 0; i <= seg; i++) {
          const t = (i / seg) * Math.PI * 2
          const zigzag = i % 2 === 0 ? 1 : -1
          const rad = r.radius + zigzag * amplitude * r.radius * 2
          const height = Math.sin(t * 2) * amplitude * 0.5
          points.push(new THREE.Vector3(
            Math.cos(t) * rad,
            height,
            Math.sin(t) * rad
          ))
        }
        const curve = new THREE.CatmullRomCurve3(points, true)
        geometry = new THREE.TubeGeometry(curve, seg * 2, r.thickness * 1.5, 6, true)
      } else if (type === 'star') {
        // SCHARFER Stern für Betonung
        const starPoints = 6
        const points = []
        for (let i = 0; i <= starPoints * 2; i++) {
          const t = (i / (starPoints * 2)) * Math.PI * 2
          const isOuter = i % 2 === 0
          const rad = r.radius * (isOuter ? 1.4 : 0.5)
          const height = isOuter ? 0.2 : -0.1
          points.push(new THREE.Vector3(
            Math.cos(t) * rad,
            height,
            Math.sin(t) * rad
          ))
        }
        const curve = new THREE.CatmullRomCurve3(points, true)
        geometry = new THREE.TubeGeometry(curve, starPoints * 8, r.thickness * 2, 6, true)
      } else if (type === 'wave') {
        // EXTREME Welle für komplexe Sätze
        const points = []
        const seg = 64
        for (let i = 0; i <= seg; i++) {
          const t = (i / seg) * Math.PI * 2
          const rad = r.radius + Math.sin(t * frequency) * r.radius * 0.3
          const height = Math.cos(t * frequency * 0.5) * 0.6
          points.push(new THREE.Vector3(
            Math.cos(t) * rad,
            height,
            Math.sin(t) * rad
          ))
        }
        const curve = new THREE.CatmullRomCurve3(points, true)
        geometry = new THREE.TubeGeometry(curve, 80, r.thickness * 1.2, 8, true)
      } else if (type === 'polygon') {
        // KANTIGES Polygon für Wiederholungen
        const sides = Math.max(5, Math.min(12, segments))
        const points = []
        for (let i = 0; i <= sides; i++) {
          const t = (i / sides) * Math.PI * 2
          points.push(new THREE.Vector3(
            Math.cos(t) * r.radius,
            0,
            Math.sin(t) * r.radius
          ))
        }
        const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0)
        geometry = new THREE.TubeGeometry(curve, sides * 3, r.thickness * 1.8, 4, true)
      } else {
        // Standard Torus
        geometry = new THREE.TorusGeometry(r.radius, r.thickness, 16, 100)
      }

      return {
        id: r.id,
        geometry,
        tilt: r.tilt || 0,
        opacity: r.opacity ?? 0.2,
        color: r.color || color,
        type,
      }
    })
  }, [rings, color])

  /* =====================================
     3) TOKEN-DATEN
     ===================================== */
  const {
    nodeCount,
    nodeWorldPositions,
    nodeScales,
    nodeColors,
    linkGeometry,
    highlightData,
  } = useMemo(() => {
    const nodeCount = (nodes || []).length
    const nodeWorldPositions = new Array(nodeCount)
    const nodeScales = new Array(nodeCount)
    const nodeColors = new Array(nodeCount)

    const colorObj = new THREE.Color()

    for (let i = 0; i < nodeCount; i++) {
      const n = nodes[i]
      const ring = ringMeshesData.find((rr) => rr.id === n.sentenceId)
      
      // Height-Offset für Helix-Layout
      let heightOffset = 0
      if (nodeLayout === 'helix') {
        heightOffset = Math.sin(n.theta * 2) * 0.4
      } else if (nodeLayout === 'spiral') {
        heightOffset = (i / Math.max(1, nodeCount - 1)) * 2 - 1
      }
      
      const v = polarToCartesian(n.radius, n.theta, ring ? ring.tilt : 0, heightOffset)
      nodeWorldPositions[i] = v
      nodeScales[i] = Math.max(0.04, n.size || 0.05)
      colorObj.set(n.color || color)
      nodeColors[i] = colorObj.clone()
    }

    // Links
    const linkPositions = new Float32Array((links || []).length * 2 * 3)
    const getNodeIndexByToken = (tokenIdx) => nodes.findIndex((n) => n.tokenIdx === tokenIdx)

    for (let i = 0; i < links.length; i++) {
      const L = links[i]
      const ai = getNodeIndexByToken(L.a)
      const bi = getNodeIndexByToken(L.b)
      const aPos = nodeWorldPositions[ai] || new THREE.Vector3()
      const bPos = nodeWorldPositions[bi] || new THREE.Vector3()
      linkPositions.set([aPos.x, aPos.y, aPos.z, bPos.x, bPos.y, bPos.z], i * 6)
    }
    const linkGeometry = new THREE.BufferGeometry()
    if (linkPositions.length > 0) {
      linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3))
    }

    // Highlights
    const highlightData = (highlights || []).map((h) => {
      const ring = ringMeshesData.find((rr) => rr.id === h.sentenceId)
      const p = polarToCartesian(h.radius, h.theta, ring ? ring.tilt : 0)
      return {
        position: p,
        size: Math.max(0.1, h.size || 0.12),
        glow: Math.max(0.2, h.glow || 0.5),
        color: h.color || color,
        text: h.text,
        sentenceId: h.sentenceId,
      }
    })

    return {
      nodeCount,
      nodeWorldPositions,
      nodeScales,
      nodeColors,
      linkGeometry,
      highlightData,
    }
  }, [rings, nodes, links, highlights, color, nodeLayout, ringMeshesData, topicHash])

  useEffect(() => {
    return () => { linkGeometry?.dispose?.() }
  }, [linkGeometry])

  useLayoutEffect(() => {
    const mesh = instRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()

    const total = Math.max(0, nodeCount)
    if (!mesh.instanceMatrix || total === 0) {
      mesh.count = 0
      mesh.instanceMatrix.needsUpdate = true
      return
    }

    mesh.count = total

    for (let i = 0; i < total; i++) {
      const p = nodeWorldPositions[i]
      const s = nodeScales[i]
      const c = nodeColors[i]

      dummy.position.copy(p)
      dummy.scale.set(s, s, s)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      if (mesh.setColorAt && c) {
        mesh.setColorAt(i, c)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [nodeCount, nodeWorldPositions, nodeScales, nodeColors])

  /* ==============
     ANIMATION
     ============== */
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    
    // Adaptive rotation based on dominant geometry
    const weights = geometryWeights || {}
    const dominant = Object.entries(weights).sort((a, b) => b[1] - a[1])[0]
    const rotSpeed = dominant?.[0] === 'spiral' || dominant?.[0] === 'tornado' ? 0.15 
      : dominant?.[0] === 'helix' ? 0.12 
      : 0.1
    
    groupRef.current.rotation.y = t * rotSpeed
    
    const oscAmp = dominant?.[0] === 'organic' ? 0.25 : 0.15
    groupRef.current.position.y = Math.sin(t * 0.5) * oscAmp
  })

  /* ======================
     RENDER ALLE GEOMETRIEN
     ====================== */
  return (
    <group ref={groupRef}>
      {/* Render all active geometries */}
      {Object.entries(allGeometries).map(([name, geom]) => (
        <group key={name}>
          {/* Lines */}
          <lineSegments
            geometry={geom.lines}
            onPointerDown={(e) => {
              e.stopPropagation()
              onInspect?.({
                kind: 'Geometry Layer',
                title: `${name} structure`,
                details: {
                  type: name,
                  weight: geom.opacity.toFixed(2),
                  active: geom.opacity > 0.05 ? 'Yes' : 'No',
                },
                mapping: [
                  `${name}: ${getGeometryDescription(name)}`,
                  `Opacity: ${(geom.opacity * 100).toFixed(0)}% (text-driven)`,
                ],
              })
            }}
          >
            <lineBasicMaterial
              color={baseColor}
              transparent
              opacity={geom.opacity * 0.7}
              blending={THREE.AdditiveBlending}
            />
          </lineSegments>
          
          {/* Glow points */}
          <points
            geometry={geom.glow}
          >
            <pointsMaterial
              size={0.14}
              color={baseColor}
              transparent
              opacity={geom.opacity * 0.35}
              blending={THREE.AdditiveBlending}
              sizeAttenuation
              depthWrite={false}
            />
          </points>
        </group>
      ))}

      {/* Rings */}
      {ringMeshesData.map((r) => (
        <mesh
          key={`ring-${r.id}-${r.type}`}
          rotation={[r.tilt, 0, 0]}
          position={[0, CENTER_Y, 0]}
          geometry={r.geometry}
          onPointerDown={(e) => {
            e.stopPropagation()
            onInspect?.({
              kind: 'Sentence ring',
              title: `Sentence ${r.id + 1} (${r.type})`,
              details: { type: r.type, opacity: r.opacity.toFixed(2), color: r.color },
              mapping: ['Shape types: torus, zigzag(questions), star(emphasis), wave(complex), polygon(repetition)'],
            })
          }}
        >
          <meshBasicMaterial color={r.color} transparent opacity={r.opacity} />
        </mesh>
      ))}

      {/* Token Nodes */}
      <instancedMesh
        ref={instRef}
        key={`inst-${nodeCount}-${nodeLayout}`}
        args={[undefined, undefined, Math.max(1, nodeCount)]}
        frustumCulled={false}
        onPointerDown={(e) => {
          e.stopPropagation()
          const i = e.instanceId ?? -1
          if (i < 0 || i >= nodeCount) return
          const n = nodes[i]
          onInspect?.({
            kind: 'Word node',
            title: n?.text ?? `Token #${i}`,
            details: {
              layout: nodeLayout,
              salience: (n?.salience ?? 0).toFixed(3),
              typeTag: n?.typeTag,
            },
            mapping: [
              `Layout: ${nodeLayout}`,
              'Position ∝ word index + layout',
              'Size ∝ word length + salience',
            ],
          })
        }}
      >
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshBasicMaterial transparent opacity={0.9} vertexColors />
      </instancedMesh>

      {/* Links */}
      {links.length > 0 && linkGeometry.attributes.position && (
        <lineSegments geometry={linkGeometry} key={`links-${links.length}`}>
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}

      {/* Highlights */}
      {highlightData.map((h, i) => (
        <mesh key={`hl-${i}`} position={h.position}>
          <sphereGeometry args={[h.size, 16, 16]} />
          <meshBasicMaterial
            color={h.color}
            transparent
            opacity={Math.min(1, 0.4 + h.glow * 0.6)}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* Central Core */}
      <mesh position={[0, CENTER_Y, 0]}>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* ------------------ HELPERS ------------------ */

function getGeometryDescription(name) {
  const descriptions = {
    tree: 'L-system branch structure (balanced, organic)',
    spiral: 'Ascending spiral (rhythmic, positive)',
    fractal: 'Crystal structure (complex, chaotic)',
    helix: 'DNA double helix (narrative, flowing)',
    organic: 'Flowing tendrils (emotional, free)',
    geometric: 'Polygon towers (formal, structured)',
    web: 'Network connections (linked, complex)',
    tornado: 'Vortex spiral (intense, dynamic)',
    molecular: 'Clustered atoms (repetitive, grouped)',
    constellation: 'Scattered stars (fragmented, poetic)',
    mandala: 'Radial symmetry (meditative, balanced)',
  }
  return descriptions[name] || name
}