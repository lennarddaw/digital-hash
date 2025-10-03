// src/ai/textAnalyzer.js
import { loadModels } from './modelLoader'

/**
 * Analysiert den eingegebenen Text und liefert:
 * - embedding: Float32Array -> Array (normalisiert, mean-pooled)
 * - sentiment: { label: 'POSITIVE'|'NEGATIVE'|'NEUTRAL', score: number }
 * - stats: erklärbare Metriken (siehe unten)
 * - hints: { emotionHints, topicHash } für deterministische, reproduzierbare Mappings
 */
export async function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return null
  }

  try {
    const { embeddingModel, sentimentModel } = await loadModels()

    // -------- Basis-Statistiken (ohne KI) --------
    const words = text.split(/\s+/).filter(Boolean)
    const sentences = text.split(/[.!?]+/).filter(Boolean)

    const exclamations = (text.match(/!/g) || []).length
    const questions = (text.match(/\?/g) || []).length
    const capsTokens = words.filter(
      (w) => w.length >= 3 && /^[A-ZÄÖÜ]+$/.test(w)
    ).length

    const punctuationMatches = (text.match(/[.,;:!?]/g) || []).length

    const sentenceLengths = sentences
      .map((s) => s.trim().split(/\s+/).filter(Boolean).length)
      .filter((n) => n > 0)

    const meanSentenceLength = sentenceLengths.length
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0

    const varianceSentenceLength = sentenceLengths.length
      ? sentenceLengths.reduce(
          (s, n) => s + Math.pow(n - meanSentenceLength, 2),
          0
        ) / sentenceLengths.length
      : 0

    const stdSentenceLength = Math.sqrt(varianceSentenceLength)

    const uniqueCount = new Set(words.map((w) => w.toLowerCase())).size
    const lexicalDiversity = words.length ? uniqueCount / words.length : 0

    const emphasisScore = Math.min(
      1,
      (exclamations + capsTokens * 0.5) / Math.max(1, sentences.length)
    )

    const questionScore = Math.min(1, questions / Math.max(1, sentences.length))

    const punctuationPerWord = words.length
      ? punctuationMatches / words.length
      : 0

    const stats = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordLength:
        words.length > 0
          ? words.reduce((sum, w) => sum + w.length, 0) / words.length
          : 0,
      uniqueWords: uniqueCount,
      lexicalDiversity, // ~ Type-Token-Ratio
      emphasisScore, // ! + ALL CAPS
      questionScore, // ?-Intensität
      meanSentenceLength,
      varianceSentenceLength,
      stdSentenceLength,
      punctuationPerWord,
    }

    // -------- Modelle (Sentiment + Embedding) --------
    const truncatedText = text.slice(0, 2000)

    // ===== Calibrated, sentence-level sentiment (mit Neutralfenster) =====
    const rawSentences = text
      .split(/(?<=[.!?]{1,3})\s+/)
      .map((s) => s.trim())
      .filter(Boolean)

    const MAX_SENTS = 60
    const sents = rawSentences.slice(0, MAX_SENTS).map((s) => s.slice(0, 400))

    let signedScores = []
    if (sents.length > 0) {
      const BATCH = 16
      for (let i = 0; i < sents.length; i += BATCH) {
        const chunk = sents.slice(i, i + BATCH)
        const chunkRes = await sentimentModel(chunk)
        for (const r of chunkRes) {
          const lbl = String(r?.label || '').toUpperCase()
          const isNeg = lbl.includes('NEG')
          const isPos = lbl.includes('POS')
          const score = typeof r?.score === 'number' ? r.score : 0.5
          // Binärmodell → mappe auf [-1, +1]
          signedScores.push(isNeg ? -score : isPos ? +score : 0)
        }
      }
    } else {
      const one = await sentimentModel(truncatedText)
      const r = Array.isArray(one) ? one[0] : one
      const lbl = String(r?.label || '').toUpperCase()
      const isNeg = lbl.includes('NEG')
      const isPos = lbl.includes('POS')
      const score = typeof r?.score === 'number' ? r.score : 0.5
      signedScores = [isNeg ? -score : isPos ? +score : 0]
    }

    const meanSigned =
      signedScores.length > 0
        ? signedScores.reduce((a, b) => a + b, 0) / signedScores.length
        : 0

    // Neutralfenster dämpft Extremwerte (|x| <= margin ⇒ NEUTRAL)
    const NEUTRAL_MARGIN = 0.15
    let aggLabel = 'NEUTRAL'
    if (meanSigned > NEUTRAL_MARGIN) aggLabel = 'POSITIVE'
    else if (meanSigned < -NEUTRAL_MARGIN) aggLabel = 'NEGATIVE'

    // Gedämpfter 0..1-Score
    const calibratedScore = clamp01(
      (Math.abs(meanSigned) - NEUTRAL_MARGIN) / (1 - NEUTRAL_MARGIN)
    )

    const sentiment = { label: aggLabel, score: calibratedScore }

    // ===== Embedding wie gehabt =====
    const embeddingResult = await embeddingModel(truncatedText, {
      pooling: 'mean',
      normalize: true,
    })
    const embedding = Array.from(embeddingResult.data || [])

    // -------- Leichte, transparente Emotions-Hints (regelbasiert) --------
    const lower = text.toLowerCase()
    const emotionHints = {
      anger: /(wut|angry|furious|rage|zorn)/.test(lower) ? 1 : 0,
      joy: /(freude|joy|glücklich|happy|delight|euphor)/.test(lower) ? 1 : 0,
      sadness: /(traurig|sad|melanch|trauer|sorrow)/.test(lower) ? 1 : 0,
      fear: /(angst|fear|furcht|anxious|panic)/.test(lower) ? 1 : 0,
    }

    // -------- Stabiler, erklärbarer Topic-Hash (aus ersten 12 Dims) --------
    const topicSlice = embedding.slice(0, 12)
    const topicHash = topicSlice
      .map((v, i) => Math.abs(Math.floor((v + 1) * 1000 + i * 97)) % 997)
      .reduce((a, b) => (a * 131 + b) % 2147483647, 7)

    return {
      embedding,
      sentiment,
      stats,
      hints: { emotionHints, topicHash },
    }
  } catch (error) {
    console.error('Text analysis failed:', error)

    // Fallback mit sinnvollen Defaults für die Visualisierung
    const safeWords = text.split(/\s+/).filter(Boolean)
    const safeSentences = text.split(/[.!?]+/).filter(Boolean)
    const safeSentenceLengths = safeSentences
      .map((s) => s.trim().split(/\s+/).filter(Boolean).length)
      .filter((n) => n > 0)
    const safeMean =
      safeSentenceLengths.length
        ? safeSentenceLengths.reduce((a, b) => a + b, 0) /
          safeSentenceLengths.length
        : 0

    return {
      embedding: new Array(384).fill(0),
      sentiment: { label: 'NEUTRAL', score: 0.5 },
      stats: {
        wordCount: safeWords.length,
        sentenceCount: safeSentences.length,
        avgWordLength:
          safeWords.length > 0
            ? safeWords.reduce((sum, w) => sum + w.length, 0) / safeWords.length
            : 0,
        uniqueWords: new Set(safeWords.map((w) => w.toLowerCase())).size,
        lexicalDiversity:
          safeWords.length > 0
            ? new Set(safeWords.map((w) => w.toLowerCase())).size /
              safeWords.length
            : 0,
        emphasisScore: 0,
        questionScore: 0,
        meanSentenceLength: safeMean,
        varianceSentenceLength: 0,
        stdSentenceLength: 0,
        punctuationPerWord: 0,
      },
      hints: {
        emotionHints: { anger: 0, joy: 0, sadness: 0, fear: 0 },
        topicHash: 1,
      },
    }
  }
}

/* ------------------ helpers ------------------ */
function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}