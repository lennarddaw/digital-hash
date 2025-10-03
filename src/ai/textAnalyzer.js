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

    // Sentiment
    const sentimentResult = await sentimentModel(truncatedText)
    const sentiment = sentimentResult?.[0] || { label: 'NEUTRAL', score: 0.5 }

    // Embedding
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

    // Debug (optional)
    // console.log('Analysis complete:', { sentiment, dim: embedding.length, stats, topicHash, emotionHints })

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