// src/ai/bloomMapper.js - ULTRA VARIATIONEN
import {
  sentimentToColor,
  hslToHex,
  wrapHue,
  clamp01,
  typeHueBias,
  EMOTION_TINTS,
} from '../utils/colorPalettes'

export function mapToBloomData(analysisResult) {
  if (!analysisResult) return null

  const {
    embedding = [],
    sentiment,
    stats = {},
    hints = {},
    sentences = [],
    tokens = [],
  } = analysisResult

  const wordCount = Math.max(0, stats.wordCount || 0)
  const sentenceCount = Math.max(1, stats.sentenceCount || 1)
  const uniqueWords = Math.max(1, stats.uniqueWords || 1)
  const diversity = typeof stats.lexicalDiversity === 'number' ? stats.lexicalDiversity : uniqueWords / Math.max(1, wordCount)
  const varSent = Math.max(0, stats.varianceSentenceLength || 0)
  const meanSent = Math.max(0, stats.meanSentenceLength || 0)
  const emphasis = clamp01(stats.emphasisScore || 0)
  const questionScore = clamp01(stats.questionScore || 0)
  
  // NEUE METRIKEN
  const rhythm = stats.rhythm || { regularity: 0.5, variance: 0, pattern: 'uniform' }
  const repetition = stats.repetition || { score: 0, clusters: [], dominant: null }
  const syntaxComplexity = stats.syntaxComplexity || { score: 0.5, subordination: 0, nesting: 0 }
  const coherence = stats.coherence || { score: 0.5, transitions: 0, flow: 'neutral' }
  const style = stats.style || { formality: 0.5, abstract: 0.5, narrative: 0.5 }

  const topicHash = hints?.topicHash || 1
  const seeded = makeRng(topicHash)

  // ---------- MULTI-GEOMETRIE SYSTEM (Hybrid) ----------
  const geometryWeights = calculateGeometryWeights(
    rhythm, repetition, syntaxComplexity, coherence, style, 
    sentiment, questionScore, emphasis, diversity
  )
  
  // ---------- GLOBALE STRUKTUR (ERWEITERT) ----------
  const embeddingSlice = embedding.slice(0, 12)
  const baseAngle = 20 + ((embeddingSlice[0] ?? 0) + 1) * 25
  const hashNudge = (topicHash % 15) * 0.3
  const angle = clamp(baseAngle + hashNudge, 15, 75)

  // Branches: mehr bei Wiederholungen, weniger bei Kohärenz
  const branches = clamp(
    Math.round(
      Math.log2(1 + sentenceCount) * 4 
      + Math.min(3, Math.sqrt(varSent))
      + repetition.score * 5
      - coherence.score * 2
    ),
    3,
    20
  )

  // Complexity: abhängig von Syntax-Komplexität
  const complexity = clamp(
    Math.round(
      wordCount / 25 
      + Math.min(3, Math.sqrt(varSent))
      + syntaxComplexity.score * 4
    ),
    2,
    8
  )

  // Symmetry: niedriger bei Chaos, höher bei Rhythmus
  const symmetry = clamp(
    diversity * 0.7 + rhythm.regularity * 0.3 - rhythm.variance * 0.2,
    0.3,
    0.98
  )

  const sentimentScore = typeof sentiment?.score === 'number' ? sentiment.score : 0.5
  const speed = Math.max(sentimentScore, emphasis)
  const direction = sentiment?.label === 'POSITIVE' ? 1 : sentiment?.label === 'NEGATIVE' ? -1 : 0
  const count = clamp(Math.round(wordCount * 2), 50, 400)
  const color = sentimentToColor(sentiment, hints?.emotionHints)

  // ---------- FARB-FUNKTIONEN ----------
  const hueForSentence = (sIndex) => {
    const a = embedding[0] ?? 0
    const b = embedding[1] ?? 0
    const c = embedding[2] ?? 0
    const h = ((a * 120 + b * 180 + c * 240) * 0.5) + sIndex * 23.7 + (topicHash % 13) * 2.1
    return wrapHue(h)
  }

  const lightFromValence = (signed) => {
    const v = clamp01(Math.abs(signed || 0))
    const sign = (signed || 0) >= 0 ? 1 : -1
    return clamp(55 + sign * (12 * v), 35, 80)
  }

  const satFromSalience = (sal) => clamp(40 + clamp01(sal) * 55, 25, 100)

  const applyEmotionTint = (h, s, l, hints) => {
    if (!hints) return [h, s, l]
    let H = h, S = s, L = l
    for (const key of ['joy', 'anger', 'sadness', 'fear']) {
      if (hints[key]) {
        const t = EMOTION_TINTS[key]
        H += t.hue; S += t.sat; L += t.light
      }
    }
    return [wrapHue(H), clamp(S, 0, 100), clamp(L, 0, 100)]
  }

  // ---------- RINGE MIT VIELFÄLTIGEN FORMEN ----------
  const rings = sentences.map((s, i) => {
    const r = 1.2 + i * 0.35 + (s.wordCount || 0) * 0.005
    const thickness = 0.02 + clamp01(s.score || 0) * 0.06
    const baseHue = hueForSentence(i)
    let sat = 58
    let light = lightFromValence(s.signedSentiment || 0)
    ;[sat, light] = [clamp(sat, 0, 100), clamp(light, 0, 100)]
    const [h2, s2, l2] = applyEmotionTint(baseHue, sat, light, hints?.emotionHints)
    const ringColor = hslToHex(h2, s2, l2)

    // RING-TYP basierend auf Satz-Eigenschaften
    let ringType = 'torus'
    const sentWords = tokens.filter(t => t.sentenceId === i && t.typeTag !== 'PUNCT')
    const hasQuestion = s.text.includes('?')
    const hasExclamation = s.text.includes('!')
    const isLong = s.wordCount > meanSent * 1.5
    
    if (hasQuestion) ringType = 'zigzag'
    else if (hasExclamation && emphasis > 0.5) ringType = 'star'
    else if (isLong && syntaxComplexity.score > 0.6) ringType = 'wave'
    else if (repetition.clusters.some(c => c.position >= s.start && c.position < s.end)) ringType = 'polygon'
    
    return {
      id: s.id,
      radius: r,
      thickness,
      tilt: ((topicHash % 23) * 0.03 + i * 0.07) % (Math.PI / 2),
      opacity: 0.25 - Math.min(0.18, i * 0.03),
      color: ringColor,
      type: ringType,
      segments: ringType === 'polygon' ? Math.max(5, Math.min(12, Math.floor(s.wordCount / 2))) : 64,
      amplitude: hasQuestion ? 0.15 : 0.05,
      frequency: hasQuestion ? 8 : 4,
    }
  })

  const tokenWords = tokens.filter((t) => t.typeTag !== 'PUNCT')

  // ---------- NODE LAYOUT (GEOMETRIE-ABHÄNGIG) ----------
  const nodeLayout = determineNodeLayout(geometryWeights, rhythm, coherence, repetition)

  // ---------- HIGHLIGHTS ----------
  const topN = 24
  const highlights = tokenWords
    .filter((t) => typeof t.salience === 'number')
    .sort((a, b) => (b.salience || 0) - (a.salience || 0))
    .slice(0, topN)
    .map((t, i) => {
      const s = sentences[t.sentenceId] || { id: 0, wordCount: 1, signedSentiment: 0 }
      const ring = rings.find((r) => r.id === (s.id ?? 0))
      const theta = (2 * Math.PI * (i + seeded())) / Math.max(6, s.wordCount)

      const baseHue = hueForSentence(t.sentenceId)
      const hue = wrapHue(baseHue + typeHueBias(t.typeTag))
      let sat = Math.min(100, 70 + clamp01(t.salience) * 25)
      let light = Math.min(90, lightFromValence(s.signedSentiment) + 5)
      const [h2, s2, l2] = applyEmotionTint(hue, sat, light, hints?.emotionHints)
      const tokenColor = hslToHex(h2, s2, l2)

      return {
        tokenIdx: t.idx,
        text: t.text,
        sentenceId: t.sentenceId,
        radius: ring ? ring.radius : 1.5,
        theta,
        size: 0.08 + (t.len || 1) * 0.02 + (t.salience || 0) * 0.12,
        glow: 0.3 + (t.salience || 0) * 0.7,
        color: tokenColor,
      }
    })

  // ---------- NODES MIT VARIABLER ANORDNUNG ----------
  const nodes = tokenWords.map((t, idx) => {
    const s = sentences[t.sentenceId] || { id: 0, wordCount: 1, score: 0, signedSentiment: 0 }
    const ring = rings.find((r) => r.id === (s.id ?? 0))
    const idxInSent = indexWithinSentence(tokens, t.idx, t.sentenceId)
    
    // Layout-abhängige Position
    let theta, radius
    if (nodeLayout === 'spiral') {
      const spiralTurns = 3
      const t_norm = idx / Math.max(1, tokenWords.length - 1)
      theta = t_norm * Math.PI * 2 * spiralTurns
      radius = (ring ? ring.radius : 1.5) * (0.7 + t_norm * 0.3)
    } else if (nodeLayout === 'helix') {
      const helixTurns = 4
      const t_norm = idx / Math.max(1, tokenWords.length - 1)
      theta = t_norm * Math.PI * 2 * helixTurns
      radius = (ring ? ring.radius : 1.5) + Math.sin(t_norm * Math.PI * 2) * 0.3
    } else if (nodeLayout === 'cluster') {
      // Cluster um Wiederholungen
      const nearCluster = repetition.clusters.find(c => Math.abs(c.position - t.idx) < 5)
      if (nearCluster) {
        theta = (2 * Math.PI * idxInSent) / Math.max(2, s.wordCount) + seeded() * 0.3
        radius = (ring ? ring.radius : 1.5) * (0.9 + seeded() * 0.2)
      } else {
        theta = (2 * Math.PI * (idxInSent + 1)) / Math.max(2, s.wordCount) + seeded() * 0.05
        radius = (ring ? ring.radius : 1.5) + (seeded() - 0.5) * 0.1
      }
    } else {
      // circular (default)
      theta = (2 * Math.PI * (idxInSent + 1)) / Math.max(2, s.wordCount) + seeded() * 0.05
      radius = (ring ? ring.radius : 1.5) + (seeded() - 0.5) * 0.1
    }
    
    const linkStrength = 0.3 + 0.7 * clamp01(s.score || 0)

    const baseHue = hueForSentence(t.sentenceId)
    const hue = wrapHue(baseHue + typeHueBias(t.typeTag))
    let sat = satFromSalience(t.salience || 0)
    let light = lightFromValence(s.signedSentiment || 0)
    const [h2, s2, l2] = applyEmotionTint(hue, sat, light, hints?.emotionHints)
    const tokenColor = hslToHex(h2, s2, l2)

    return {
      tokenIdx: t.idx,
      text: t.text,
      sentenceId: t.sentenceId,
      radius,
      theta,
      salience: clamp01(t.salience || 0),
      size: 0.04 + (t.len || 1) * 0.01,
      linkStrength,
      color: tokenColor,
      typeTag: t.typeTag,
    }
  })

  // ---------- LINKS ----------
  const links = []
  for (let sId = 0; sId < sentences.length; sId++) {
    const sentenceTokens = nodes.filter((n) => n.sentenceId === sId)
    for (let i = 1; i < sentenceTokens.length; i++) {
      const a = sentenceTokens[i - 1]
      const b = sentenceTokens[i]
      links.push({
        a: a.tokenIdx,
        b: b.tokenIdx,
        weight: (a.linkStrength + b.linkStrength) * 0.5,
      })
    }
  }

  // ---------- PARTIKEL ----------
  const baseHueGlobal = direction > 0 ? 0.5 : direction < 0 ? 0.8 : 0.62
  const tokenParticles = tokenWords.slice(0, 320).map((t) => {
    const s = sentences[t.sentenceId] || { signedSentiment: 0 }
    const baseHue = hueForSentence(t.sentenceId)
    const hue = wrapHue(baseHue + typeHueBias(t.typeTag))
    const hueBias = (hue / 360) - baseHueGlobal

    return {
      tokenIdx: t.idx,
      size: 0.1 + (t.len || 1) * 0.03,
      speed: 0.5 + clamp01(t.salience || 0) * 0.9,
      hueBias,
      direction,
    }
  })

  return {
    structure: {
      branches,
      complexity,
      symmetry,
      angle,
      color,
      rings,
      nodes,
      links,
      highlights,
      
      // MULTI-GEOMETRIE SYSTEM
      geometryWeights,  // { tree: 0.8, spiral: 0.3, fractal: 0.1, ... }
      nodeLayout,       // circular, spiral, helix, cluster, network
      morphFactor: clamp01(rhythm.variance + syntaxComplexity.score) / 2,
      twistFactor: clamp01(coherence.score * style.narrative),
      fragmentationLevel: clamp01(1 - coherence.score),
    },

    energy: {
      speed,
      count,
      direction,
      tokens: tokenParticles,
    },

    metadata: {
      sentiment: sentiment?.label ?? 'NEUTRAL',
      confidence: sentimentScore,
      wordCount,
      meanSentenceLength: meanSent,
      varianceSentenceLength: varSent,
      lexicalDiversity: diversity,
      questionScore,
      emphasisScore: emphasis,
      topicHash,
      
      // NEUE METADATA
      rhythm,
      repetition,
      syntaxComplexity,
      coherence,
      style,
      geometryWeights,
      nodeLayout,
      
      mappingNotes: {
        geometryWeights: 'Multiple geometries blend: tree(balanced), spiral(rhythmic), fractal(complex), helix(narrative), organic(emotional), geometric(formal), web(connected), tornado(intense), molecular(clustered), constellation(fragmented), mandala(meditative)',
        branches: '∝ log(sentences) + repetition - coherence',
        complexity: '∝ words + syntax complexity',
        symmetry: '∝ diversity + rhythm regularity',
        rings: 'shapes: torus(default), zigzag(questions), star(emphasis), wave(long+complex), polygon(repetition)',
        nodeLayout: 'circular(default), spiral(rhythmic), helix(narrative), cluster(repetition), network(connected)',
      },
    },
  }
}

/* ------------------ MULTI-GEOMETRIE-SYSTEM ------------------ */

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function calculateGeometryWeights(rhythm, repetition, syntaxComplexity, coherence, style, sentiment, questionScore, emphasis, diversity) {
  // Jede Geometrie bekommt einen Weight 0-1
  // Mehrere können gleichzeitig aktiv sein!
  
  return {
    // L-SYSTEM BAUM: Organisch, natürlich, ausgewogen
    tree: clamp01(
      (1 - Math.abs(sentiment?.score - 0.5) * 2) * 0.7 + // neutral sentiment
      diversity * 0.3 +
      (style.narrative > 0.3 && style.narrative < 0.7 ? 0.5 : 0)
    ),
    
    // SPIRAL: Rhythmisch, regelmäßig, aufsteigend
    spiral: clamp01(
      rhythm.regularity * 0.8 +
      (rhythm.pattern === 'pulsing' ? 0.6 : 0) +
      (sentiment?.label === 'POSITIVE' ? 0.4 : 0)
    ),
    
    // FRACTAL CRYSTAL: Komplex, chaotisch, fragmentiert
    fractal: clamp01(
      syntaxComplexity.score * 0.7 +
      (1 - coherence.score) * 0.6 +
      (style.abstract > 0.5 ? 0.5 : 0)
    ),
    
    // DNA HELIX: Narrativ, fließend, verbunden
    helix: clamp01(
      style.narrative * 0.8 +
      coherence.score * 0.6 +
      (coherence.flow === 'smooth' ? 0.5 : 0)
    ),
    
    // ORGANIC FLOW: Emotional, frei, wellenartig
    organic: clamp01(
      (1 - style.formality) * 0.6 +
      repetition.score * 0.7 +
      emphasis * 0.5
    ),
    
    // GEOMETRIC POLYHEDRA: Formal, strukturiert, präzise
    geometric: clamp01(
      style.formality * 0.8 +
      rhythm.regularity * 0.5 +
      (syntaxComplexity.subordination < 0.3 ? 0.4 : 0)
    ),
    
    // WEB/NETWORK: Verbindungen, Beziehungen, komplex
    web: clamp01(
      syntaxComplexity.nesting * 0.7 +
      (coherence.transitions > 0.5 ? 0.6 : 0) +
      diversity * 0.4
    ),
    
    // TORNADO/VORTEX: Dynamisch, emotional, intensiv
    tornado: clamp01(
      Math.abs(sentiment?.score - 0.5) * 2 * 0.8 + // extreme sentiment
      emphasis * 0.7 +
      (rhythm.variance > 0.5 ? 0.5 : 0)
    ),
    
    // MOLECULAR: Clustered, repetitiv, gebündelt
    molecular: clamp01(
      repetition.score * 0.9 +
      (repetition.clusters.length > 3 ? 0.6 : 0) +
      (1 - coherence.score) * 0.3
    ),
    
    // CONSTELLATION: Fragmente, poetisch, verstreut
    constellation: clamp01(
      (coherence.flow === 'fragmented' ? 0.8 : 0) +
      questionScore * 0.6 +
      (style.abstract > 0.6 ? 0.5 : 0)
    ),
    
    // MANDALA: Symmetrisch, meditativ, zentriert
    mandala: clamp01(
      rhythm.regularity * 0.7 +
      (sentiment?.label === 'NEUTRAL' ? 0.6 : 0) +
      (style.formality > 0.4 && style.formality < 0.7 ? 0.5 : 0)
    ),
  }
}

function determineNodeLayout(geometryWeights, rhythm, coherence, repetition) {
  // Wähle Layout basierend auf dominanter Geometrie
  const dominant = Object.entries(geometryWeights)
    .sort((a, b) => b[1] - a[1])[0]
  
  if (dominant[1] < 0.3) return 'circular' // zu schwach, default
  
  const [name, weight] = dominant
  
  if (name === 'spiral' || name === 'tornado') return 'spiral'
  if (name === 'helix') return 'helix'
  if (name === 'fractal' || name === 'constellation') return 'cluster'
  if (name === 'molecular') return 'cluster'
  if (name === 'web') return 'network'
  
  // Fallbacks
  if (repetition.score > 0.4) return 'cluster'
  if (rhythm.pattern === 'pulsing') return 'spiral'
  if (coherence.flow === 'smooth') return 'helix'
  
  return 'circular'
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

/* ------------------ HELPERS ------------------ */

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function makeRng(seed) {
  let s = (seed >>> 0) || 1
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 4294967296
  }
}

function indexWithinSentence(allTokens, tokenIdx, sentenceId) {
  let pos = 0
  for (let i = 0; i < allTokens.length; i++) {
    const t = allTokens[i]
    if (t.sentenceId === sentenceId && t.typeTag !== 'PUNCT') {
      if (t.idx === tokenIdx) return pos
      pos++
    }
  }
  return pos
}