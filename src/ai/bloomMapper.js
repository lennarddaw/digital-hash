// src/ai/bloomMapper.js
// Mapping: Analysen -> Visual-Parameter (global + pro Satz/Token)
// Neu: Mehrfarben-Konzept via HSL (Hue=Thema, Sat=Salience, Light=Valenz)
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

  // Rückwärtskompatible "Basisfarbe" (z. B. für Link-Material)
  const color = sentimentToColor(sentiment, hints?.emotionHints)

  // ---------- NEU: Hue-Konzept pro Satz ----------
  // Satz-Hue deterministisch aus Embedding + Satzindex (Themenwechsel → Farbwechsel)
  const hueForSentence = (sIndex) => {
    const a = embedding[0] ?? 0
    const b = embedding[1] ?? 0
    const c = embedding[2] ?? 0
    // Projektion + leichter Offset je Satz
    const h = ((a * 120 + b * 180 + c * 240) * 0.5) + sIndex * 23.7 + (topicHash % 13) * 2.1
    return wrapHue(h)
  }

  // Lightness (Helligkeit) aus Valenz/Sentiment
  // signedSentiment ∈ [-1..+1] → L ∈ ~[43..67]
  const lightFromValence = (signed) => {
    const v = clamp01(Math.abs(signed || 0))
    const sign = (signed || 0) >= 0 ? 1 : -1
    return clamp(55 + sign * (12 * v), 35, 80)
  }

  // Saturation (Sättigung) aus Salience (Token-Wichtigkeit)
  const satFromSalience = (sal) => clamp(40 + clamp01(sal) * 55, 25, 100)

  // Emotions-Tints leicht einmischen (optional, dezent)
  const applyEmotionTint = (h, s, l, hints) => {
    if (!hints) return [h, s, l]
    let H = h, S = s, L = l
    for (const key of ['joy', 'anger', 'sadness', 'fear']) {
      if (hints[key]) {
        const t = EMOTION_TINTS[key]
        H += t.hue; S += t.sat; L += t.light
      }
    }
    return [wrapHue(H), clamp( S, 0, 100 ), clamp( L, 0, 100 )]
  }

  // ---------- NEU: satz- & tokenbasierte Elemente ----------
  // Sätze -> Ringe (Radius/Thickness ~ Länge/Score, Farbe = HSL(H_thema, ~60, L_valenz))
  const rings = sentences.map((s, i) => {
    const r = 1.2 + i * 0.35 + (s.wordCount || 0) * 0.005
    const thickness = 0.02 + clamp01(s.score || 0) * 0.06
    const baseHue = hueForSentence(i)
    let sat = 58
    let light = lightFromValence(s.signedSentiment || 0)
    ;[sat, light] = [clamp(sat, 0, 100), clamp(light, 0, 100)]
    const [h2, s2, l2] = applyEmotionTint(baseHue, sat, light, hints?.emotionHints)
    const ringColor = hslToHex(h2, s2, l2)

    return {
      id: s.id,
      radius: r,
      thickness,
      tilt: ((topicHash % 23) * 0.03 + i * 0.07) % (Math.PI / 2),
      opacity: 0.25 - Math.min(0.18, i * 0.03),
      color: ringColor,
    }
  })

  // Token-Highlights & Nodes: Mehrfarben (H=Satzzugehörigkeit + Typ-Bias, S=Salience, L=Valenz)
  const tokenWords = tokens.filter((t) => t.typeTag !== 'PUNCT')

  // --- Highlights: Top-N nach Salience
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

  // --- Nodes: pro Wort/Token
  const nodes = tokenWords.map((t) => {
    const s = sentences[t.sentenceId] || { id: 0, wordCount: 1, score: 0, signedSentiment: 0 }
    const ring = rings.find((r) => r.id === (s.id ?? 0))
    const idxInSent = indexWithinSentence(tokens, t.idx, t.sentenceId)
    const theta =
      (2 * Math.PI * (idxInSent + 1)) / Math.max(2, s.wordCount) + seeded() * 0.05
    const radius = (ring ? ring.radius : 1.5) + (seeded() - 0.5) * 0.1
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

  // Links: kurze Kanten zwischen aufeinanderfolgenden Tokens eines Satzes
  // (Material-Farbe bleibt global für Dezenz; pro-Link-Farbe optional später)
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

  // Partikel-spezifische Tokenparameter (EnergyParticles im Token-Modus)
  // HueBias relativ zur Basis-Hue des Partikelsystems (pos=0.5, neg=0.8, neu=0.62)
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
      hueBias,      // harmoniert mit Partikel-HSL in EnergyParticles
      direction,    // erbt globale Richtung
    }
  })

  return {
    structure: {
      branches,
      complexity,
      symmetry,
      angle,
      color,        // globale Basis (Fallback/Links)

      // neue, feingranulare Daten
      rings,        // [{id, radius, thickness, tilt, opacity, color}]
      nodes,        // [{tokenIdx, radius, theta, size, salience, color, ...}]
      links,        // [{a: tokenIdx, b: tokenIdx, weight}]
      highlights,   // Top-Tokens für Marker/Glow
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
      mappingNotes: {
        branches: '∝ log(#Sätze) + Varianz(Satzlänge)',
        complexity: '∝ Wortanzahl + Varianz(Satzlänge)',
        symmetry: '∝ Lexikalische Diversität (TTR)',
        angle: '∝ Embedding[0] + Topic-Hash',
        color: 'Globaler Fallback; Ringe/NODES nutzen HSL (Hue=Thema, Sat=Salience, Light=Valenz)',
        energy: 'Speed=max(Sentiment, Betonung), Richtung=Sentiment; Token-HueBias ~ Token-Farbe',
        rings: 'pro Satz: Radius ∝ Position & Länge, Dicke ∝ Satz-Emotion, Farbe ∝ Thema/Valenz',
        nodes: 'pro Wort: Position ∝ Satz & Index, Größe ∝ Länge, Farbe ∝ Salience/Valenz/Typ',
        links: 'lokale Abhängigkeit aufeinanderfolgender Wörter, Gewicht ∝ Satz-Emotion',
      },
    },
  }
}

/* ------------------ Helpers ------------------ */

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