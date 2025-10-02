import { sentimentToColor } from '../utils/colorPalettes'

export function mapToBloomData(analysisResult) {
  if (!analysisResult) return null
  
  const { embedding, sentiment, stats } = analysisResult
  
  // Embedding dimensions → visual parameters
  const embeddingSlice = embedding.slice(0, 10)
  
  return {
    structure: {
      branches: Math.max(3, Math.min(12, Math.floor(stats.sentenceCount * 1.5))),
      complexity: Math.max(2, Math.min(5, Math.floor(stats.wordCount / 20))),
      symmetry: stats.uniqueWords / stats.wordCount,
      angle: 20 + (embeddingSlice[0] + 1) * 20, // -1 bis 1 → 20 bis 60
      color: sentimentToColor(sentiment)
    },
    
    energy: {
      speed: sentiment.score,
      count: Math.min(200, stats.wordCount * 2),
      direction: sentiment.label === 'POSITIVE' ? 1 : -1
    },
    
    metadata: {
      sentiment: sentiment.label,
      confidence: sentiment.score,
      wordCount: stats.wordCount
    }
  }
}