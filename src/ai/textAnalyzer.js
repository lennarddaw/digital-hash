import { loadModels } from './modelLoader'

export async function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return null
  }
  
  const { embeddingModel, sentimentModel } = await loadModels()
  
  // 1. Embeddings (semantische Bedeutung)
  const embedding = await embeddingModel(text, { pooling: 'mean', normalize: true })
  
  // 2. Sentiment (emotionale Färbung)
  const sentiment = await sentimentModel(text)
  
  // 3. Basis-Statistiken
  const words = text.split(/\s+/).filter(Boolean)
  const sentences = text.split(/[.!?]+/).filter(Boolean)
  
  const stats = {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length,
    uniqueWords: new Set(words.map(w => w.toLowerCase())).size
  }
  
  return {
    embedding: Array.from(embedding.data),
    sentiment: sentiment[0],
    stats
  }
}