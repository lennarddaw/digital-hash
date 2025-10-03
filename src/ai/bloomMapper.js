// src/ai/bloomMapper.js
// Leitet erklärbare, deterministische Visual-Parameter aus der Textanalyse ab.
import { sentimentToColor } from '../utils/colorPalettes'

export function mapToBloomData(analysisResult) {
  if (!analysisResult) return null

  const { embedding = [], sentiment, stats = {}, hints = {} } = analysisResult

  // --- robuste Defaults ---
  const wordCount = Math.max(0, stats.wordCount || 0)
  const sentenceCount = Math.max(1, stats.sentenceCount || 1)
  const uniqueWords = Math.max(1, stats.uniqueWords || 1)

  // --- erklärbare Features ---
  const diversity =
    typeof stats.lexicalDiversity === 'number'
      ? stats.lexicalDiversity
      : uniqueWords / Math.max(1, wordCount)

  const varSent = Math.max(0, stats.varianceSentenceLength || 0)
  const meanSent = Math.max(0, stats.meanSentenceLength || 0)
  const emphasis = Math.max(0, Math.min(1, stats.emphasisScore || 0))
  const questionScore = Math.max(0, Math.min(1, stats.questionScore || 0))

  // Stabilität/Determinismus über Hash aus Embeddings (kommt aus textAnalyzer)
  const topicHash = hints?.topicHash || 1

  // Winkel: Embedding + kleiner Hash-Nudge → 15–75°
  const embeddingSlice = embedding.slice(0, 12)
  const baseAngle = 20 + ((embeddingSlice[0] ?? 0) + 1) * 25 // -1..1 -> 20..70
  const hashNudge = (topicHash % 15) * 0.3
  const angle = clamp(baseAngle + hashNudge, 15, 75)

  // Äste: log(Sätze) + Varianz → 3–16
  const branches = clamp(
    Math.round(Math.log2(1 + sentenceCount) * 4 + Math.min(3, Math.sqrt(varSent))),
    3,
    16
  )

  // Komplexität: Wortzahl + Varianz → 2–7
  const complexity = clamp(
    Math.round(wordCount / 25 + Math.min(3, Math.sqrt(varSent))),
    2,
    7
  )

  // Symmetrie: aus lexical diversity → 0.40–0.95
  const symmetry = clamp(diversity, 0.4, 0.95)

  // Energie:
  // - speed: max(Sentiment-Confidence, Betonung/Emphasis)
  // - direction: POS=1, NEG=-1, NEU=0 (schwebend)
  // - count: skaliert mit Wortzahl → 50–400
  const sentimentScore = typeof sentiment?.score === 'number' ? sentiment.score : 0.5
  const speed = Math.max(sentimentScore, emphasis)
  const direction =
    sentiment?.label === 'POSITIVE' ? 1 : sentiment?.label === 'NEGATIVE' ? -1 : 0
  const count = clamp(Math.round(wordCount * 2), 50, 400)

  // Farbe: Sentiment-Farbe mit optionalen Emotion-Hinweisen (joy/anger/...)
  const color = sentimentToColor(sentiment, hints?.emotionHints)

  return {
    structure: {
      branches,
      complexity,
      symmetry,
      angle,
      color,
    },

    energy: {
      speed,
      count,
      direction,
    },

    // Metadaten für UI/Legenden – machen die Entstehung nachvollziehbar
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
      // Kurzlegende für Tooltips / Info-Panel
      mappingNotes: {
        branches: '∝ log(#Sätze) + Varianz(Satzlänge)',
        complexity: '∝ Wortanzahl + Varianz(Satzlänge)',
        symmetry: '∝ Lexikalische Diversität (TTR)',
        angle: '∝ Embedding[0] + Topic-Hash',
        color: 'Sentiment ± Emotions-Hints',
        energy: 'Speed=max(Sentiment, Betonung), Richtung=Sentiment',
      },
    },
  }
}

// kleine Hilfsfunktion, um Werte einzurahmen
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}
