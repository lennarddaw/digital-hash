// src/three/BloomGenerator.jsx
import { useMemo, useRef, useLayoutEffect, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function BloomGenerator({ params, onInspect }) {
  const groupRef = useRef()
  const baseLineMatRef = useRef()
  const instRef = useRef() // InstancedMesh-Ref (Token-Nodes)

  const {
    // globale Struktur (wie bisher)
    branches = 5,
    complexity = 3,
    symmetry = 0.8,
    angle = 25,
    color = '#00d4ff',
    meanSentenceLength = 10,
    topicHash = 1,

    // neue, feingranulare Daten
    rings = [],       // [{id, radius, thickness, tilt, opacity, color}]
    nodes = [],       // [{tokenIdx, radius, theta, size, salience, color, sentenceId, text?, typeTag?}]
    links = [],       // [{a: tokenIdx, b: tokenIdx, weight}]
    highlights = [],  // [{tokenIdx, radius, theta, size, glow, color, sentenceId?, text?}]
  } = params || {}

  // Deterministisches RNG (für feine, reproduzierbare Störungen)
  function makeRng(seed) {
    let s = (seed >>> 0) || 1
    return () => {
      s = (1664525 * s + 1013904223) >>> 0
      return s / 4294967296
    }
  }
  const rng = makeRng(topicHash || 1)

  // Hilfsfunktionen
  const CENTER_Y = -3
  function polarToCartesian(radius, theta, tilt = 0) {
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius
    const v = new THREE.Vector3(x, 0, z)
    v.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
    v.y += CENTER_Y
    return v
  }

  /* =========================
     1) L-System-basierte Basis
     ========================= */
  const { baseGeometry, baseGlowGeometry, baseColor, lineWidth } = useMemo(() => {
    const baseColor = new THREE.Color(color || '#00d4ff')
    const lineWidth = Math.max(1.5, Math.min(4, (meanSentenceLength || 10) / 8))

    const points = []
    const glowPoints = []

    const angleRadGlobal = (angle * Math.PI) / 180

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

    const center = new THREE.Vector3(0, CENTER_Y, 0)
    const baseDir = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < branches; i++) {
      const rotAngle = (i * Math.PI * 2) / branches
      const mainDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotAngle)
      mainDir.add(new THREE.Vector3((rng() - 0.5) * 0.3, 0, (rng() - 0.5) * 0.3)).normalize()
      createBranch(center, mainDir, complexity, 1)
    }

    return {
      baseGeometry: new THREE.BufferGeometry().setFromPoints(points),
      baseGlowGeometry: new THREE.BufferGeometry().setFromPoints(glowPoints),
      baseColor,
      lineWidth,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, complexity, symmetry, angle, color, meanSentenceLength, topicHash])

  /* =====================================
     2) Ringe (pro Satz) & Token/Link-Daten
     ===================================== */
  const {
    ringMeshesData,
    nodeCount,
    nodeWorldPositions,
    nodeScales,
    nodeColors,
    linkGeometry,
    highlightData,
  } = useMemo(() => {
    // Ringe
    const ringMeshesData = (rings || []).map((r) => ({
      id: r.id,
      radius: r.radius,
      thickness: r.thickness,
      tilt: r.tilt || 0,
      opacity: r.opacity ?? 0.2,
      color: r.color || color,
    }))

    // Token-Positionen & -Eigenschaften
    const nodeCount = (nodes || []).length
    const nodeWorldPositions = new Array(nodeCount)
    const nodeScales = new Array(nodeCount)
    const nodeColors = new Array(nodeCount)

    const colorObj = new THREE.Color()

    for (let i = 0; i < nodeCount; i++) {
      const n = nodes[i]
      const ring = ringMeshesData.find((rr) => rr.id === n.sentenceId)
      const v = polarToCartesian(n.radius, n.theta, ring ? ring.tilt : 0)
      nodeWorldPositions[i] = v
      nodeScales[i] = Math.max(0.04, n.size || 0.05)
      colorObj.set(n.color || color)
      nodeColors[i] = colorObj.clone()
    }

    // Links (als LineSegments-Geometrie)
    const linkPositions = new Float32Array((links || []).length * 2 * 3)
    const getNodeIndexByToken = (tokenIdx) =>
      nodes.findIndex((n) => n.tokenIdx === tokenIdx)

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
      ringMeshesData,
      nodeCount,
      nodeWorldPositions,
      nodeScales,
      nodeColors,
      linkGeometry,
      highlightData,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rings, nodes, links, highlights, color, topicHash])

  // linkGeometry sauber entsorgen, wenn neu erstellt
  useEffect(() => {
    return () => {
      linkGeometry?.dispose?.()
    }
  }, [linkGeometry])

  // Instanzmatrizen & -farben setzen
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
     Animation/Puls
     ============== */
  useFrame((state) => {
    if (!groupRef.current || !baseLineMatRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.y = t * 0.1
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.2

    const pulse = Math.sin(t * 2) * 0.3 + 0.7
    baseLineMatRef.current.opacity = 0.6 + pulse * 0.2
  })

  /* ======================
     Render der Geometrien
     ====================== */
  return (
    <group ref={groupRef}>
      {/* 1) Globale organische Basis */}
      <lineSegments
        geometry={baseGeometry}
        key={`base-${branches}-${complexity}-${symmetry}-${angle}-${topicHash}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          onInspect?.({
            kind: 'Basisstruktur',
            title: 'L-System-Kontur',
            details: {
              branches,
              complexity,
              symmetry: symmetry.toFixed(2),
              angle: `${angle}°`,
              color,
              meanSentenceLength,
              topicHash,
            },
            mapping: [
              'Äste ∝ log(#Sätze) + Varianz der Satzlängen',
              'Komplexität ∝ Wortanzahl + Varianz der Satzlängen',
              'Symmetrie ∝ Lexikalische Diversität (TTR)',
              'Winkel ∝ Embedding[0] + Topic-Hash',
              'Liniendicke ∝ mittlere Satzlänge',
            ],
          })
        }}
      >
        <lineBasicMaterial
          ref={baseLineMatRef}
          color={baseColor}
          linewidth={lineWidth} // Hinweis: Browser ignorieren linewidth oft – Intent bleibt erhalten
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Glow entlang der Basis */}
      <points
        geometry={baseGlowGeometry}
        key={`baseglow-${branches}-${complexity}-${symmetry}-${angle}-${topicHash}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          onInspect?.({
            kind: 'Basis-Glow',
            title: 'Energie entlang der Äste',
            details: { color, topicHash },
            mapping: [
              'Glow-Punkte sampeln die Branches gleichmäßig',
              'Leichte, deterministische Störung ∝ Seed(Topic-Hash)',
            ],
          })
        }}
      >
        <pointsMaterial
          size={0.14}
          color={baseColor}
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* 2) Satz-Ringe */}
      {ringMeshesData.map((r) => (
        <mesh
          key={`ring-${r.id}-${r.radius.toFixed(3)}-${r.thickness.toFixed(3)}`}
          rotation={[r.tilt, 0, 0]}
          position={[0, CENTER_Y, 0]}
          onPointerDown={(e) => {
            e.stopPropagation()
            onInspect?.({
              kind: 'Satz-Ring',
              title: `Satz ${r.id + 1}`,
              details: {
                radius: r.radius.toFixed(2),
                thickness: r.thickness.toFixed(3),
                tilt: r.tilt.toFixed(3),
                opacity: typeof r.opacity === 'number' ? r.opacity.toFixed(2) : r.opacity,
                color: r.color,
              },
              mapping: [
                'Radius ∝ Satz-Index & Satzlänge',
                'Dicke ∝ Satz-Emotion (|Sentiment|)',
                'Neigung ∝ Topic-Hash (deterministische Variation)',
              ],
            })
          }}
        >
          <torusGeometry args={[r.radius, r.thickness, 16, 100]} />
          <meshBasicMaterial color={r.color} transparent opacity={r.opacity} />
        </mesh>
      ))}

      {/* 3) Token-Nodes (Instanzen) */}
      <instancedMesh
        ref={instRef}
        key={`inst-${nodeCount}`}
        args={[undefined, undefined, Math.max(1, nodeCount)]}
        frustumCulled={false}
        onPointerDown={(e) => {
          e.stopPropagation()
          const i = e.instanceId ?? -1
          if (i < 0 || i >= nodeCount) return
          const n = nodes[i]
          onInspect?.({
            kind: 'Wort-Knoten',
            title: n?.text ?? `(Token #${n?.tokenIdx ?? i})`,
            details: {
              tokenIdx: n?.tokenIdx,
              sentenceId: n?.sentenceId,
              radius: n?.radius?.toFixed?.(2),
              theta: n?.theta?.toFixed?.(3),
              size: n?.size?.toFixed?.(3),
              salience: (n?.salience ?? 0).toFixed(3),
              typeTag: n?.typeTag,
              color: n?.color,
            },
            mapping: [
              'Position auf dem Satz-Ring ∝ Wortindex im Satz',
              'Größe ∝ Wortlänge',
              'Glow/Salience ∝ Kosinus-Ähnlichkeit zum Dokument-Embedding',
              'Farbnuancen ∝ Worttyp (NAME/NUMBER/DATE/URL/WORD)',
            ],
          })
        }}
      >
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshBasicMaterial transparent opacity={0.9} vertexColors />
      </instancedMesh>

      {/* 4) Links zwischen Tokens */}
      {links.length > 0 && linkGeometry.attributes.position && (
        <lineSegments
          geometry={linkGeometry}
          key={`links-${links.length}`}
          onPointerDown={(e) => {
            e.stopPropagation()
            onInspect?.({
              kind: 'Wort-Link',
              title: 'Lokale Wortfolge',
              details: {
                links: links.length,
                hinweis: 'Gewicht ∝ Satz-Emotion',
              },
              mapping: [
                'Kante verbindet aufeinanderfolgende Wörter im Satz',
                'Gewichtung leitet Verzweigungsstärke lokal ab',
              ],
            })
          }}
        >
          <lineBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      )}

      {/* 5) Highlights (leuchtende Marker) */}
      {highlightData.map((h, i) => (
        <mesh
          key={`hl-${i}`}
          position={h.position}
          onPointerDown={(e) => {
            e.stopPropagation()
            onInspect?.({
              kind: 'Highlight-Token',
              title: h.text ?? '(Top-Token)',
              details: {
                sentenceId: h.sentenceId,
                size: h.size.toFixed(3),
                glow: h.glow.toFixed(3),
                color: h.color,
              },
              mapping: [
                'Top-N nach Salience (semantisch prägend)',
                'Größe/Glow ∝ Salience',
                'Position ∝ Satz-Ring + Wortindex',
              ],
            })
          }}
        >
          <sphereGeometry args={[h.size, 16, 16]} />
          <meshBasicMaterial
            color={h.color}
            transparent
            opacity={Math.min(1, 0.4 + h.glow * 0.6)}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* 6) Zentraler Kern */}
      <mesh
        position={[0, CENTER_Y, 0]}
        onPointerDown={(e) => {
          e.stopPropagation()
          onInspect?.({
            kind: 'Nucleus',
            title: 'Zentraler Kern',
            details: { color, topicHash },
            mapping: [
              'Fokale Mitte der Struktur',
              'Leichter Puls synchron mit globaler Energie',
            ],
          })
        }}
      >
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