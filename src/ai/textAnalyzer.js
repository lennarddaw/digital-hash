// src/ai/textAnalyzer.js
import { loadModels } from './modelLoader'

/**
 * Liefert:
 * - embedding: Dokument-Einbettung (Array, normalisiert, mean-pooled)
 * - sentiment: { label: 'POSITIVE'|'NEGATIVE'|'NEUTRAL', score: 0..1 } (kalibriert, satzweise aggregiert)
 * - stats: erklärbare Metriken (Wort/Satz-Zahlen, TTR, Varianzen, ...)
 * - hints: { emotionHints, topicHash } (deterministische Reproduzierbarkeit)
 * - sentences: [{ id, text, start, end, wordCount, signedSentiment, score }]
 * - tokens:    [{ text, idx, charStart, charEnd, sentenceId, len, isUpper, hasPunct, typeTag, salience, emb? }]
 *
 * Hinweis: Um RAM zu schonen, bekommen nur die ersten MAX_TOKENS_EMBED Tokens eine (kurze) Embedding-Slice.
 */

const MAX_SENTS = 60
const MAX_TOKENS_EMBED = 256           // pro Wort optional Embedding-Slice
const EMBEDDING_SLICE_DIMS = 12        // kompakte Repräsentation
const NEUTRAL_MARGIN = 0.15            // Sentiment-Neutralfenster

export async function analyzeText(text) {
  if (!text || text.trim().length === 0) return null

  try {
    const { embeddingModel, sentimentModel } = await loadModels()

    // ---------- Preprocessing: Sätze & Tokens mit Offsets ----------
    const sentences = splitSentencesWithOffsets(text).slice(0, MAX_SENTS)
    const tokens = tokenizeWithOffsets(text)

    // ---------- Basis-Statistiken ----------
    const words = tokens.filter((t) => t.typeTag !== 'PUNCT') // "echte" Wörter
    const sentenceLengths = sentences.map((s) => s.wordCount)
    const meanSentenceLength = avg(sentenceLengths)
    const varianceSentenceLength = variance(sentenceLengths, meanSentenceLength)
    const stdSentenceLength = Math.sqrt(varianceSentenceLength)

    const uniqueCount = new Set(
      words.map((w) => w.text.toLowerCase())
    ).size

    const punctuationMatches = (text.match(/[.,;:!?]/g) || []).length
    const exclamations = (text.match(/!/g) || []).length
    const questions = (text.match(/\?/g) || []).length
    const capsTokens = words.filter(
      (w) => w.len >= 3 && /^[A-ZÄÖÜ]+$/.test(w.text)
    ).length

    const lexicalDiversity = words.length ? uniqueCount / words.length : 0
    const punctuationPerWord = words.length ? punctuationMatches / words.length : 0
    const emphasisScore = Math.min(
      1,
      (exclamations + capsTokens * 0.5) / Math.max(1, sentences.length)
    )
    const questionScore = Math.min(1, questions / Math.max(1, sentences.length))

    const stats = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordLength: words.length ? avg(words.map((w) => w.len)) : 0,
      uniqueWords: uniqueCount,
      lexicalDiversity,          // ~ Type-Token-Ratio
      emphasisScore,             // ! + ALL CAPS
      questionScore,             // ?-Intensität
      meanSentenceLength,
      varianceSentenceLength,
      stdSentenceLength,
      punctuationPerWord,
    }

    // ---------- Satzweises Sentiment + Kalibrierung ----------
    const sentTexts = sentences.map((s) => s.text.slice(0, 400))
    const signedScores = await batchedSentiment(sentimentModel, sentTexts)
    const meanSigned = signedScores.length ? avg(signedScores) : 0

    let aggLabel = 'NEUTRAL'
    if (meanSigned > NEUTRAL_MARGIN) aggLabel = 'POSITIVE'
    else if (meanSigned < -NEUTRAL_MARGIN) aggLabel = 'NEGATIVE'

    const sentimentScore = clamp01(
      (Math.abs(meanSigned) - NEUTRAL_MARGIN) / (1 - NEUTRAL_MARGIN)
    )
    const sentiment = { label: aggLabel, score: sentimentScore }

    // schreibe pro Satz den gemessenen Wert zurück (für lokale Modulationen)
    sentences.forEach((s, i) => {
      s.signedSentiment = signedScores[i] ?? 0         // [-1..+1]
      s.score = Math.abs(s.signedSentiment)            // 0..1
    })

    // ---------- Dokument-Embedding ----------
    const truncatedText = text.slice(0, 2000)
    const docEmbTensor = await embeddingModel(truncatedText, {
      pooling: 'mean',
      normalize: true,
    })
    const embedding = Array.from(docEmbTensor.data || [])
    const topicSlice = embedding.slice(0, EMBEDDING_SLICE_DIMS)
    const topicHash = stableHash(topicSlice)

    // ---------- Token-Embeddings (Teilmenge) + Salience ----------
    // Wir betten maximal die ersten N nicht-PUNCT Tokens (Performance!).
    const tokenTextsForEmb = words.slice(0, MAX_TOKENS_EMBED).map((t) => t.text)
    const tokenEmbOutputs = await batchedEmbeddings(
      embeddingModel,
      tokenTextsForEmb
    )

    // Cosinus-Ähnlichkeit → Salience
    const sims = tokenEmbOutputs.map((e) => cosineSim(embedding, e))
    const { min: simMin, max: simMax } = minMax(sims)
    const normSims = sims.map((v) =>
      simMax > simMin ? (v - simMin) / (simMax - simMin) : 0.5
    )

    // Embedding-Slice pro Token (kompakt)
    const tokenEmbSlices = tokenEmbOutputs.map((e) => e.slice(0, EMBEDDING_SLICE_DIMS))

    // Tokens anreichern (salience, sentenceId, kurze Embedding-Slices)
    let embIdx = 0
    const sentenceBoundaries = sentences.map((s) => [s.start, s.end])
    const tokensEnriched = tokens.map((t) => {
      const sentenceId = findSentenceId(sentenceBoundaries, t.charStart, t.charEnd)
      const base = { ...t, sentenceId }
      if (t.typeTag === 'PUNCT') return { ...base, salience: 0 }

      // nur für die ersten MAX_TOKENS_EMBED Wörter mit Embedding
      if (embIdx < tokenEmbSlices.length) {
        const salience = normSims[embIdx]
        const emb = tokenEmbSlices[embIdx]
        embIdx++
        return { ...base, salience, emb }
      }
      return { ...base, salience: 0 }
    })

    // ---------- Emotions-Hints (transparent, regelbasiert) ----------
    const lower = text.toLowerCase()
    const emotionHints = {
      anger: /(wut|angry|furious|rage|zorn)/.test(lower) ? 1 : 0,
      joy: /(freude|joy|glücklich|happy|delight|euphor)/.test(lower) ? 1 : 0,
      sadness: /(traurig|sad|melanch|trauer|sorrow)/.test(lower) ? 1 : 0,
      fear: /(angst|fear|furcht|anxious|panic)/.test(lower) ? 1 : 0,
    }

    return {
      embedding,                       // Dokument-Vektor
      sentiment,                       // kalibriert, neutralfähig
      stats,                           // global interpretierbar
      hints: { emotionHints, topicHash },
      sentences,                       // lokale Struktur + satzweise Scores
      tokens: tokensEnriched,          // jedes Wort/Punkt bekommt Bedeutung
    }
  } catch (error) {
    console.error('Text analysis failed:', error)
    // Fallback – minimal, aber kompatibel
    const safeTokens = tokenizeWithOffsets(text)
    const safeSentences = splitSentencesWithOffsets(text)
    return {
      embedding: new Array(384).fill(0),
      sentiment: { label: 'NEUTRAL', score: 0.5 },
      stats: {
        wordCount: safeTokens.filter((t) => t.typeTag !== 'PUNCT').length,
        sentenceCount: safeSentences.length,
        avgWordLength: 0,
        uniqueWords: 0,
        lexicalDiversity: 0,
        emphasisScore: 0,
        questionScore: 0,
        meanSentenceLength: avg(safeSentences.map((s) => s.wordCount)),
        varianceSentenceLength: 0,
        stdSentenceLength: 0,
        punctuationPerWord: 0,
      },
      hints: { emotionHints: { anger: 0, joy: 0, sadness: 0, fear: 0 }, topicHash: 1 },
      sentences: safeSentences.map((s) => ({ ...s, signedSentiment: 0, score: 0 })),
      tokens: safeTokens.map((t) => ({ ...t, sentenceId: 0, salience: 0 })),
    }
  }
}

/* ------------------ Helpers: NLP-Light ------------------ */

function splitSentencesWithOffsets(text) {
  // Satzende: ., !, ?, … gefolgt von Leerraum/Zeilenumbruch
  const regex = /[^.!?…]+[.!?…]+|\S+$/g
  const result = []
  let m
  while ((m = regex.exec(text)) !== null) {
    const raw = m[0]
    const start = m.index
    const end = start + raw.length
    const clean = raw.trim()
    if (!clean) continue
    const wordCount = clean.split(/\s+/).filter(Boolean).length
    result.push({ id: result.length, text: clean, start, end, wordCount })
  }
  return result
}

function tokenizeWithOffsets(text) {
  const tokens = []
  const regex = /([A-Za-zÄÖÜäöüß]+(?:'[A-Za-zÄÖÜäöüß]+)?)|(\d+[.,]?\d*)|([.,;:!?()\[\]{}"“”‚‘'…])|(\S)/g
  let m
  while ((m = regex.exec(text)) !== null) {
    const [full, word, number, punct, other] = m
    const tokenText = full
    const charStart = m.index
    const charEnd = charStart + full.length
    const isWord = !!word
    const isNumber = !!number
    const isPunct = !!punct
    const len = full.length
    const isUpper = /^[A-ZÄÖÜ]/.test(full)
    const hasPunct = /[.,;:!?]/.test(full)
    const typeTag = isPunct
      ? 'PUNCT'
      : isNumber
      ? (isDateLike(full) ? 'DATE' : 'NUMBER')
      : isUrlLike(full)
      ? 'URL'
      : isWord && isNameLike(full)
      ? 'NAME'
      : 'WORD'
    tokens.push({
      text: tokenText,
      idx: tokens.length,
      charStart,
      charEnd,
      len,
      isUpper,
      hasPunct,
      typeTag,
    })
  }
  return tokens
}

function isDateLike(s) {
  // einfache Heuristiken: 12.03.1999, 1999, 30/11/1965, Month names
  if (/^\d{4}$/.test(s) && +s >= 1500 && +s <= 2100) return true
  if (/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(s)) return true
  if (/^(jan|feb|mär|maerz|mar|apr|mai|jun|jul|aug|sep|sept|oct|okt|nov|dec|dez)\.?$/i.test(s)) return true
  return false
}
function isUrlLike(s) {
  return /^(https?:\/\/|www\.)/i.test(s)
}
// ACHTUNG: Deutsch hat Großschreibung für Nomen; wir markieren hier "NAME" nur bei durchgehend Uppercase oder typischen Name-Heuristiken.
function isNameLike(s) {
  return /^[A-ZÄÖÜ][a-zäöüß]+(-[A-ZÄÖÜ][a-zäöüß]+)*$/.test(s) && !isDateLike(s)
}

/* ------------------ Helpers: Modelle ------------------ */

async function batchedSentiment(sentimentModel, sentences) {
  if (!sentences || sentences.length === 0) return []
  const out = []
  const BATCH = 16
  for (let i = 0; i < sentences.length; i += BATCH) {
    const chunk = sentences.slice(i, i + BATCH)
    const res = await sentimentModel(chunk)
    for (const r of res) {
      const lbl = String(r?.label || '').toUpperCase()
      const isNeg = lbl.includes('NEG')
      const isPos = lbl.includes('POS')
      const score = typeof r?.score === 'number' ? r.score : 0.5
      out.push(isNeg ? -score : isPos ? +score : 0)
    }
  }
  return out
}

async function batchedEmbeddings(embeddingModel, texts) {
  if (!texts || texts.length === 0) return []
  const out = []
  const BATCH = 32
  for (let i = 0; i < texts.length; i += BATCH) {
    const chunk = texts.slice(i, i + BATCH)
    const res = await embeddingModel(chunk, { pooling: 'mean', normalize: true })
    // transformers.js gibt bei Batch entweder eine Liste von Tensoren oder einen Stack zurück – wir handlen beide Fälle robust:
    if (Array.isArray(res)) {
      for (const r of res) out.push(Array.from(r.data || []))
    } else if (res?.data && Array.isArray(res.data)) {
      // bereits als Array von Arrays
      for (const row of res.data) out.push(Array.from(row))
    } else if (res?.data) {
      // einzelner Tensor (passiert bei BATCH=1)
      out.push(Array.from(res.data))
    }
  }
  return out
}

/* ------------------ Helpers: Mathe ------------------ */

function cosineSim(a, b) {
  const n = Math.min(a.length, b.length)
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i]
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function minMax(arr) {
  let min = Infinity, max = -Infinity
  for (const v of arr) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!isFinite(min)) min = 0
  if (!isFinite(max)) max = 1
  return { min, max }
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function variance(arr, mean = avg(arr)) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function stableHash(arr) {
  let h = 7
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    h = (h * 131 + Math.abs(Math.floor((v + 1) * 1000 + i * 97)) % 997) % 2147483647
  }
  return h
}

function findSentenceId(boundaries, start, end) {
  for (let i = 0; i < boundaries.length; i++) {
    const [s, e] = boundaries[i]
    if (start >= s && end <= e) return i
  }
  // fallback: nächster Satz
  let best = 0, bestDist = Infinity
  for (let i = 0; i < boundaries.length; i++) {
    const [s, e] = boundaries[i]
    const d = Math.min(Math.abs(start - s), Math.abs(end - e))
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}