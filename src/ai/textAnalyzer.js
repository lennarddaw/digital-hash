// src/ai/textAnalyzer.js - ENHANCED VERSION
import { loadModels } from './modelLoader'

const MAX_SENTS = 60
const MAX_TOKENS_EMBED = 256
const EMBEDDING_SLICE_DIMS = 12
const NEUTRAL_MARGIN = 0.15

export async function analyzeText(text) {
  if (!text || text.trim().length === 0) return null

  try {
    const { embeddingModel, sentimentModel } = await loadModels()

    const sentences = splitSentencesWithOffsets(text).slice(0, MAX_SENTS)
    const tokens = tokenizeWithOffsets(text)
    const words = tokens.filter((t) => t.typeTag !== 'PUNCT')
    
    // ---------- NEUE ERWEITERTE METRIKEN ----------
    
    // Rhythmus-Analyse
    const rhythm = analyzeRhythm(words, sentences)
    
    // Wiederholungen
    const repetition = analyzeRepetition(words)
    
    // Satzstruktur-Komplexität
    const syntaxComplexity = analyzeSyntaxComplexity(sentences, tokens)
    
    // Semantische Kohärenz (basierend auf Satzübergängen)
    const coherence = analyzeSentenceCoherence(sentences)
    
    // Stilistische Merkmale
    const style = analyzeStyle(text, words, sentences)

    // ---------- BASIS-STATISTIKEN ----------
    const sentenceLengths = sentences.map((s) => s.wordCount)
    const meanSentenceLength = avg(sentenceLengths)
    const varianceSentenceLength = variance(sentenceLengths, meanSentenceLength)
    const stdSentenceLength = Math.sqrt(varianceSentenceLength)

    const uniqueCount = new Set(words.map((w) => w.text.toLowerCase())).size
    const punctuationMatches = (text.match(/[.,;:!?]/g) || []).length
    const exclamations = (text.match(/!/g) || []).length
    const questions = (text.match(/\?/g) || []).length
    const capsTokens = words.filter((w) => w.len >= 3 && /^[A-ZÄÖÜ]+$/.test(w.text)).length

    const lexicalDiversity = words.length ? uniqueCount / words.length : 0
    const punctuationPerWord = words.length ? punctuationMatches / words.length : 0
    const emphasisScore = Math.min(1, (exclamations + capsTokens * 0.5) / Math.max(1, sentences.length))
    const questionScore = Math.min(1, questions / Math.max(1, sentences.length))

    const stats = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordLength: words.length ? avg(words.map((w) => w.len)) : 0,
      uniqueWords: uniqueCount,
      lexicalDiversity,
      emphasisScore,
      questionScore,
      meanSentenceLength,
      varianceSentenceLength,
      stdSentenceLength,
      punctuationPerWord,
      
      // NEUE METRIKEN
      rhythm,              // { regularity, variance, pattern }
      repetition,          // { score, clusters, dominant }
      syntaxComplexity,    // { score, subordination, nesting }
      coherence,           // { score, transitions, flow }
      style,               // { formality, abstract, narrative }
    }

    // ---------- SENTIMENT ----------
    const sentTexts = sentences.map((s) => s.text.slice(0, 400))
    const signedScores = await batchedSentiment(sentimentModel, sentTexts)
    const meanSigned = signedScores.length ? avg(signedScores) : 0

    let aggLabel = 'NEUTRAL'
    if (meanSigned > NEUTRAL_MARGIN) aggLabel = 'POSITIVE'
    else if (meanSigned < -NEUTRAL_MARGIN) aggLabel = 'NEGATIVE'

    const sentimentScore = clamp01((Math.abs(meanSigned) - NEUTRAL_MARGIN) / (1 - NEUTRAL_MARGIN))
    const sentiment = { label: aggLabel, score: sentimentScore }

    sentences.forEach((s, i) => {
      s.signedSentiment = signedScores[i] ?? 0
      s.score = Math.abs(s.signedSentiment)
    })

    // ---------- EMBEDDINGS ----------
    const truncatedText = text.slice(0, 2000)
    const docEmbTensor = await embeddingModel(truncatedText, { pooling: 'mean', normalize: true })
    const embedding = Array.from(docEmbTensor.data || [])
    const topicSlice = embedding.slice(0, EMBEDDING_SLICE_DIMS)
    const topicHash = stableHash(topicSlice)

    const tokenTextsForEmb = words.slice(0, MAX_TOKENS_EMBED).map((t) => t.text)
    const tokenEmbOutputs = await batchedEmbeddings(embeddingModel, tokenTextsForEmb)

    const sims = tokenEmbOutputs.map((e) => cosineSim(embedding, e))
    const { min: simMin, max: simMax } = minMax(sims)
    const normSims = sims.map((v) => simMax > simMin ? (v - simMin) / (simMax - simMin) : 0.5)
    const tokenEmbSlices = tokenEmbOutputs.map((e) => e.slice(0, EMBEDDING_SLICE_DIMS))

    let embIdx = 0
    const sentenceBoundaries = sentences.map((s) => [s.start, s.end])
    const tokensEnriched = tokens.map((t) => {
      const sentenceId = findSentenceId(sentenceBoundaries, t.charStart, t.charEnd)
      const base = { ...t, sentenceId }
      if (t.typeTag === 'PUNCT') return { ...base, salience: 0 }
      if (embIdx < tokenEmbSlices.length) {
        const salience = normSims[embIdx]
        const emb = tokenEmbSlices[embIdx]
        embIdx++
        return { ...base, salience, emb }
      }
      return { ...base, salience: 0 }
    })

    // ---------- EMOTIONS ----------
    const lower = text.toLowerCase()
    const emotionHints = {
      anger: /(wut|angry|furious|rage|zorn)/.test(lower) ? 1 : 0,
      joy: /(freude|joy|glücklich|happy|delight|euphor)/.test(lower) ? 1 : 0,
      sadness: /(traurig|sad|melanch|trauer|sorrow)/.test(lower) ? 1 : 0,
      fear: /(angst|fear|furcht|anxious|panic)/.test(lower) ? 1 : 0,
    }

    return {
      embedding,
      sentiment,
      stats,
      hints: { emotionHints, topicHash },
      sentences,
      tokens: tokensEnriched,
    }
  } catch (error) {
    console.error('Text analysis failed:', error)
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
        rhythm: { regularity: 0.5, variance: 0, pattern: 'uniform' },
        repetition: { score: 0, clusters: [], dominant: null },
        syntaxComplexity: { score: 0.5, subordination: 0, nesting: 0 },
        coherence: { score: 0.5, transitions: 0, flow: 'neutral' },
        style: { formality: 0.5, abstract: 0.5, narrative: 0.5 },
      },
      hints: { emotionHints: { anger: 0, joy: 0, sadness: 0, fear: 0 }, topicHash: 1 },
      sentences: safeSentences.map((s) => ({ ...s, signedSentiment: 0, score: 0 })),
      tokens: safeTokens.map((t) => ({ ...t, sentenceId: 0, salience: 0 })),
    }
  }
}

/* ------------------ NEUE ANALYSE-FUNKTIONEN ------------------ */

function analyzeRhythm(words, sentences) {
  if (sentences.length < 2) return { regularity: 0.5, variance: 0, pattern: 'uniform' }
  
  // Wortlängen-Muster pro Satz
  const patterns = sentences.map(s => {
    const sentWords = words.filter(w => w.sentenceId === s.id)
    return sentWords.map(w => w.len)
  })
  
  // Berechne Varianz der Satzrhythmen
  const rhythmScores = patterns.map(p => {
    if (p.length < 2) return 0
    const v = variance(p, avg(p))
    return Math.sqrt(v)
  })
  
  const avgRhythm = avg(rhythmScores)
  const rhythmVar = variance(rhythmScores, avgRhythm)
  const regularity = clamp01(1 - Math.min(1, rhythmVar / 2))
  
  // Erkenne Muster: gleichmäßig, pulsierend, chaotisch
  let pattern = 'uniform'
  if (rhythmVar > 1.5) pattern = 'chaotic'
  else if (avgRhythm > 2) pattern = 'pulsing'
  else if (regularity > 0.7) pattern = 'regular'
  
  return {
    regularity: clamp01(regularity),
    variance: clamp01(rhythmVar / 3),
    pattern
  }
}

function analyzeRepetition(words) {
  const wordMap = new Map()
  const lowerWords = words.map(w => w.text.toLowerCase())
  
  lowerWords.forEach(w => {
    wordMap.set(w, (wordMap.get(w) || 0) + 1)
  })
  
  const repeated = Array.from(wordMap.entries())
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
  
  const totalRep = repeated.reduce((sum, [_, count]) => sum + count, 0)
  const repScore = lowerWords.length ? totalRep / lowerWords.length : 0
  
  // Finde Cluster (aufeinanderfolgende Wiederholungen)
  const clusters = []
  for (let i = 0; i < lowerWords.length - 1; i++) {
    if (lowerWords[i] === lowerWords[i + 1]) {
      clusters.push({ word: lowerWords[i], position: i })
    }
  }
  
  return {
    score: clamp01(repScore),
    clusters,
    dominant: repeated[0]?.[0] || null
  }
}

function analyzeSyntaxComplexity(sentences, tokens) {
  if (sentences.length === 0) return { score: 0.5, subordination: 0, nesting: 0 }
  
  // Zähle Kommas und Konjunktionen als Proxy für Verschachtelung
  const commas = tokens.filter(t => t.text === ',').length
  const conjunctions = tokens.filter(t => 
    /^(und|oder|aber|denn|weil|dass|obwohl|wenn|and|or|but|because|that|although|if)$/i.test(t.text)
  ).length
  
  const avgCommasPerSent = sentences.length ? commas / sentences.length : 0
  const avgConjPerSent = sentences.length ? conjunctions / sentences.length : 0
  
  const subordination = clamp01(avgConjPerSent / 2)
  const nesting = clamp01(avgCommasPerSent / 3)
  const complexityScore = clamp01((subordination + nesting) / 2)
  
  return {
    score: complexityScore,
    subordination,
    nesting
  }
}

function analyzeSentenceCoherence(sentences) {
  if (sentences.length < 2) return { score: 0.5, transitions: 0, flow: 'neutral' }
  
  // Übergangswörter
  const transitionWords = /^(außerdem|jedoch|deshalb|daher|folglich|zudem|dennoch|also|furthermore|however|therefore|moreover|thus)/i
  
  let transitions = 0
  sentences.forEach(s => {
    if (transitionWords.test(s.text.trim())) transitions++
  })
  
  const transitionScore = clamp01(transitions / sentences.length)
  
  // Längenvarianz als Proxy für Flow
  const lengths = sentences.map(s => s.wordCount)
  const lengthVar = variance(lengths, avg(lengths))
  const flowScore = clamp01(1 - Math.min(1, lengthVar / 50))
  
  const coherenceScore = (transitionScore * 0.4 + flowScore * 0.6)
  
  let flow = 'neutral'
  if (coherenceScore > 0.7) flow = 'smooth'
  else if (coherenceScore < 0.3) flow = 'fragmented'
  
  return {
    score: coherenceScore,
    transitions: transitionScore,
    flow
  }
}

function analyzeStyle(text, words, sentences) {
  // Formalität: lange Wörter + wenig Kontraktionen
  const avgWordLen = words.length ? avg(words.map(w => w.len)) : 0
  const contractions = (text.match(/'(ll|ve|re|s|t|d|m)/g) || []).length
  const formality = clamp01(avgWordLen / 8 - contractions / words.length)
  
  // Abstraktheit: Substantive vs. Verben (heuristisch)
  const upperWords = words.filter(w => w.isUpper && w.len > 2).length
  const abstract = clamp01(upperWords / Math.max(1, words.length) * 2)
  
  // Narrativität: Vergangenheitsformen (heuristisch)
  const pastTense = (text.match(/\b\w+(ed|te|ten|ete|eten)\b/gi) || []).length
  const narrative = clamp01(pastTense / Math.max(1, words.length) * 3)
  
  return {
    formality: clamp01(formality),
    abstract: clamp01(abstract),
    narrative: clamp01(narrative)
  }
}

/* ------------------ HELPERS ------------------ */

function splitSentencesWithOffsets(text) {
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
  const regex = /([A-Za-zÄÖÜäöüß]+(?:'[A-Za-zÄÖÜäöüß]+)?)|(\d+[.,]?\d*)|([.,;:!?()\[\]{}"„"‚''…])|(\S)/g
  let m
  while ((m = regex.exec(text)) !== null) {
    const [full, word, number, punct] = m
    const tokenText = full
    const charStart = m.index
    const charEnd = charStart + full.length
    const isWord = !!word
    const isNumber = !!number
    const isPunct = !!punct
    const len = full.length
    const isUpper = /^[A-ZÄÖÜ]/.test(full)
    const hasPunct = /[.,;:!?]/.test(full)
    const typeTag = isPunct ? 'PUNCT'
      : isNumber ? (isDateLike(full) ? 'DATE' : 'NUMBER')
      : isUrlLike(full) ? 'URL'
      : isWord && isNameLike(full) ? 'NAME'
      : 'WORD'
    tokens.push({ text: tokenText, idx: tokens.length, charStart, charEnd, len, isUpper, hasPunct, typeTag })
  }
  return tokens
}

function isDateLike(s) {
  if (/^\d{4}$/.test(s) && +s >= 1500 && +s <= 2100) return true
  if (/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(s)) return true
  if (/^(jan|feb|mär|maerz|mar|apr|mai|jun|jul|aug|sep|sept|oct|okt|nov|dec|dez)\.?$/i.test(s)) return true
  return false
}

function isUrlLike(s) { return /^(https?:\/\/|www\.)/i.test(s) }

function isNameLike(s) {
  return /^[A-ZÄÖÜ][a-zäöüß]+(-[A-ZÄÖÜ][a-zäöüß]+)*$/.test(s) && !isDateLike(s)
}

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
    if (Array.isArray(res)) {
      for (const r of res) out.push(Array.from(r.data || []))
    } else if (res?.data && Array.isArray(res.data)) {
      for (const row of res.data) out.push(Array.from(row))
    } else if (res?.data) {
      out.push(Array.from(res.data))
    }
  }
  return out
}

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
  let best = 0, bestDist = Infinity
  for (let i = 0; i < boundaries.length; i++) {
    const [s, e] = boundaries[i]
    const d = Math.min(Math.abs(start - s), Math.abs(end - e))
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}