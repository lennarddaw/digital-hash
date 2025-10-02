import { loadModels } from './modelLoader'

export async function analyzeText(text) {
  if (!text || text.trim().length === 0) {
    return null
  }
  
  try {
    const { embeddingModel, sentimentModel } = await loadModels()
    
    // Basis-Statistiken zuerst (braucht keine AI)
    const words = text.split(/\s+/).filter(Boolean)
    const sentences = text.split(/[.!?]+/).filter(Boolean)
    
    const stats = {
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordLength: words.length > 0 
        ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
        : 0,
      uniqueWords: new Set(words.map(w => w.toLowerCase())).size
    }
    
    // Text für Modelle vorbereiten (max 512 tokens)
    const truncatedText = text.slice(0, 2000)
    
    // Sentiment analysieren
    console.log('Analyzing sentiment...')
    const sentimentResult = await sentimentModel(truncatedText)
    const sentiment = sentimentResult[0]
    
    // Embeddings generieren
    console.log('Generating embeddings...')
    const embeddingResult = await embeddingModel(truncatedText, { 
      pooling: 'mean', 
      normalize: true 
    })
    
    // Embedding zu Array konvertieren
    const embedding = Array.from(embeddingResult.data)
    
    console.log('Analysis complete!', {
      sentimentLabel: sentiment.label,
      sentimentScore: sentiment.score,
      embeddingDim: embedding.length,
      stats
    })
    
    return {
      embedding,
      sentiment,
      stats
    }
    
  } catch (error) {
    console.error('Text analysis failed:', error)
    
    // Fallback mit Dummy-Daten
    return {
      embedding: new Array(384).fill(0),
      sentiment: {
        label: 'NEUTRAL',
        score: 0.5
      },
      stats: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        sentenceCount: text.split(/[.!?]+/).filter(Boolean).length,
        avgWordLength: 5,
        uniqueWords: 10
      }
    }
  }
}