// src/ai/bloomMapper.js
// Mapping: Analysen -> Visual-Parameter (global + pro Satz/Token)
import { sentimentToColor } from '../utils/colorPalettes'

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

  // ---------- robuste Defaults ----------
  const wordCount = Math.max(0, stats.wordCount || 0)
  const sentenceCount = Math.max(1, stats.sentenceCount || 1)
  const uniqueWords = Math.max(1, stats.uniqueWords || 1)
  const diversity =
    typeof stats.lexicalDiversity === 'number'
      ? stats.lexicalDiversity
      : uniqueWords / Math.max(1, wordCount)
  const varSent = Math.max(0, stats.varianceSentenceLength || 0)
  const meanSent = Math.max(0, stats.meanSentenceLength || 0)
  const emphasis = clamp01(stats.emphasisScore || 0)
  const questionScore = clamp01(stats.questionScore || 0)

  const topicHash = hints?.topicHash || 1
  const seeded = makeRng(topicHash)

  // ---------- globale Struktur (wie bisher) ----------
  const embeddingSlice = embedding.slice(0, 12)
  const baseAngle = 20 + ((embeddingSlice[0] ?? 0) + 1) * 25 // -1..1 -> 20..70
  const hashNudge = (topicHash % 15) * 0.3
  const angle = clamp(baseAngle + hashNudge, 15, 75)

  const branches = clamp(
    Math.round(Math.log2(1 + sentenceCount) * 4 + Math.min(3, Math.sqrt(varSent))),
    3,
    16
  )

  const complexity = clamp(
    Math.round(wordCount / 25 + Math.min(3, Math.sqrt(varSent))),
    2,
    7
  )

  const symmetry = clamp(diversity, 0.4, 0.95)

  const sentimentScore = typeof sentiment?.score === 'number' ? sentiment.score : 0.5
  const speed = Math.max(sentimentScore, emphasis)
  const direction =
    sentiment?.label === 'POSITIVE' ? 1 : sentiment?.label === 'NEGATIVE' ? -1 : 0
  const count = clamp(Math.round(wordCount * 2), 50, 400)

  const color = sentimentToColor(sentiment, hints?.emotionHints)

  // ---------- NEU: satz- & tokenbasierte Elemente ----------
  // Sätze -> Ringe (Radius/Thickness ~ Länge/Score)
  const rings = sentences.map((s, i) => {
    const r = 1.2 + i * 0.35 + (s.wordCount || 0) * 0.005
    const thickness = 0.02 + clamp01(s.score || 0) * 0.06
    return {
      id: s.id,
      radius: r,
      thickness,
      // leichte Neigung pro Satz aus Hash → „Drehung“ im Raum
      tilt: ((topicHash % 23) * 0.03 + i * 0.07) % (Math.PI / 2),
      opacity: 0.25 - Math.min(0.18, i * 0.03),
      color,
    }
  })

  // Token-Highlights: Top-N nach Salience (ohne PUNCT)
  const tokenWords = tokens.filter((t) => t.typeTag !== 'PUNCT')
  const topN = 24
  const highlights = tokenWords
    .filter((t) => typeof t.salience === 'number')
    .sort((a, b) => (b.salience || 0) - (a.salience || 0))
    .slice(0, topN)
    .map((t, i) => {
      // mapping in polare Position auf dem Satz-Ring
      const s = sentences[t.sentenceId] || { id: 0, wordCount: 1 }
      const ring = rings.find((r) => r.id === (s.id ?? 0))
      const theta = (2 * Math.PI * (i + seeded())) / Math.max(6, s.wordCount)
      return {
        tokenIdx: t.idx,
        text: t.text,
        sentenceId: t.sentenceId,
        radius: ring ? ring.radius : 1.5,
        theta,
        size: 0.08 + (t.len || 1) * 0.02 + (t.salience || 0) * 0.12, // Wortlänge + Salience
        glow: 0.3 + (t.salience || 0) * 0.7,
        color: colorForToken(t, color),
      }
    })

  // Token-Nodes (für spätere „Perlenketten“ auf Ästen): kompaktes Layout
  // Wir verteilen Tokens pro Satz entlang des Rings; "linkStrength" moduliert lokale Verzweigungen.
  const nodes = tokenWords.map((t) => {
    const s = sentences[t.sentenceId] || { id: 0, wordCount: 1, score: 0 }
    const ring = rings.find((r) => r.id === (s.id ?? 0))
    const idxInSent = indexWithinSentence(tokens, t.idx, t.sentenceId)
    const theta =
      (2 * Math.PI * (idxInSent + 1)) / Math.max(2, s.wordCount) + seeded() * 0.05
    const radius = (ring ? ring.radius : 1.5) + (seeded() - 0.5) * 0.1
    const linkStrength = 0.3 + 0.7 * clamp01(s.score || 0) // stärkere Verzweigung bei starken Satzemotionen

    return {
      tokenIdx: t.idx,
      text: t.text,
      sentenceId: t.sentenceId,
      radius,
      theta,
      salience: clamp01(t.salience || 0),
      size: 0.04 + (t.len || 1) * 0.01,
      linkStrength,
      color: colorForToken(t, color),
      typeTag: t.typeTag,
    }
  })

  // Links: kurze Kanten zwischen aufeinanderfolgenden Tokens eines Satzes
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

  // Partikel-spezifische Tokenparameter (für EnergyParticles als alternative „Wort-Partikel“)
  const tokenParticles = tokenWords.slice(0, 320).map((t) => ({
    tokenIdx: t.idx,
    size: 0.1 + (t.len || 1) * 0.03,
    speed: 0.5 + clamp01(t.salience || 0) * 0.9, // salientere Wörter bewegen sich schneller
    hueBias: hueBiasForToken(t), // verschiebt HSL-Hue leicht nach Worttypen
    direction, // erbt globale Richtung
  }))

  return {
    structure: {
      branches,
      complexity,
      symmetry,
      angle,
      color,

      // neue, feingranulare Daten
      rings,       // [{id, radius, thickness, tilt, opacity, color}]
      nodes,       // [{tokenIdx, radius, theta, size, salience, color, ...}]
      links,       // [{a: tokenIdx, b: tokenIdx, weight}]
      highlights,  // Top-Tokens für Marker/Glow
    },

    energy: {
      speed,
      count,
      direction,
      // optional: tokengetriebene Partikel
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
      mappingNotes: {
        branches: '∝ log(#Sätze) + Varianz(Satzlänge)',
        complexity: '∝ Wortanzahl + Varianz(Satzlänge)',
        symmetry: '∝ Lexikalische Diversität (TTR)',
        angle: '∝ Embedding[0] + Topic-Hash',
        color: 'Sentiment ± Emotions-Hints',
        energy: 'Speed=max(Sentiment, Betonung), Richtung=Sentiment',
        rings: 'pro Satz: Radius ∝ Position & Länge, Dicke ∝ Satz-Emotion',
        nodes: 'pro Wort: Position ∝ Satz & Index, Größe ∝ Länge, Glow ∝ Salience',
        links: 'lokale Abhängigkeit aufeinanderfolgender Wörter, Gewicht ∝ Satz-Emotion',
      },
    },
  }
}

/* ------------------ Helpers ------------------ */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

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

function colorForToken(t, baseHex) {
  // kleine, deterministische Variation nach Token-Typ
  // NAME -> helleres Cyan; NUMBER/DATE -> Türkis; URL -> Blau; WORD -> Basis
  const c = hexToRgb(baseHex || '#00d4ff')
  const boost = (dr, dg, db) =>
    rgbToHex(
      clamp255(c.r + dr),
      clamp255(c.g + dg),
      clamp255(c.b + db)
    )

  switch (t.typeTag) {
    case 'NAME':
      return boost(20, 35, 35)
    case 'NUMBER':
    case 'DATE':
      return boost(10, 50, 0)
    case 'URL':
      return boost(0, 20, 60)
    default:
      return baseHex || '#00d4ff'
  }
}

function hueBiasForToken(t) {
  // -0.1..+0.1 Hue-Shift abhängig vom Typ
  switch (t.typeTag) {
    case 'NAME': return +0.06
    case 'NUMBER':
    case 'DATE': return +0.03
    case 'URL': return -0.05
    default: return 0
  }
}

function hexToRgb(hex) {
  const clean = (hex || '#00d4ff').replace('#', '')
  const num = parseInt(clean.length === 3 ? expand3(clean) : clean, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => {
        const s = v.toString(16)
        return s.length === 1 ? '0' + s : s
      })
      .join('')
  )
}

function expand3(h) {
  return h.split('').map((c) => c + c).join('')
}

function clamp255(x) {
  return Math.max(0, Math.min(255, Math.round(x)))
}