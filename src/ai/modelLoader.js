import { pipeline, env } from '@xenova/transformers'

// Konfiguration für bessere Kompatibilität
env.allowLocalModels = false
env.useBrowserCache = true

let embeddingModel = null
let sentimentModel = null
let isLoading = false
let loadError = null

export async function loadModels() {
  if (embeddingModel && sentimentModel) {
    return { embeddingModel, sentimentModel }
  }
  
  if (isLoading) {
    // Warte bis Loading fertig ist
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!isLoading) {
          clearInterval(check)
          resolve()
        }
      }, 100)
    })
    return { embeddingModel, sentimentModel }
  }
  
  isLoading = true
  loadError = null
  
  try {
    console.log('Loading AI models...')
    
    // Sentiment Model (kleiner, lädt schneller)
    if (!sentimentModel) {
      console.log('Loading sentiment model...')
      sentimentModel = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        { 
          quantized: true,
          progress_callback: (progress) => {
            console.log('Sentiment model loading:', progress)
          }
        }
      )
      console.log('Sentiment model loaded!')
    }
    
    // Embedding Model
    if (!embeddingModel) {
      console.log('Loading embedding model...')
      embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          quantized: true,
          progress_callback: (progress) => {
            console.log('Embedding model loading:', progress)
          }
        }
      )
      console.log('Embedding model loaded!')
    }
    
    console.log('All models loaded successfully!')
    return { embeddingModel, sentimentModel }
    
  } catch (error) {
    console.error('Failed to load models:', error)
    loadError = error
    throw error
  } finally {
    isLoading = false
  }
}

export function getModels() {
  return { embeddingModel, sentimentModel, isLoading, loadError }
}

export function getLoadingStatus() {
  return {
    isLoading,
    error: loadError,
    modelsLoaded: !!(embeddingModel && sentimentModel)
  }
}