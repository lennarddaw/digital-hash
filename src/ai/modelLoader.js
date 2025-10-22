// src/ai/modelLoader.js
import { pipeline, env } from '@xenova/transformers'

// ===== KONFIGURATION =====
env.allowLocalModels = true
env.allowRemoteModels = true
env.useBrowserCache = true
env.useCustomCache = false
env.remoteHost = 'https://huggingface.co'
env.remotePathTemplate = '{model}/resolve/{revision}/'

// ===== MODEL KONFIGURATIONEN =====
const MODEL_CONFIGS = {
  en: {
    sentiment: {
      name: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      task: 'sentiment-analysis',
      size: '~260 MB',
      quantized: true
    },
    embedding: {
      name: 'Xenova/all-MiniLM-L6-v2',
      task: 'feature-extraction',
      size: '~90 MB',
      quantized: true
    }
  },
  de: {
    sentiment: {
      name: 'Xenova/distilbert-base-multilingual-cased',
      task: 'sentiment-analysis',
      size: '~260 MB',
      quantized: true
    },
    embedding: {
      name: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
      task: 'feature-extraction',
      size: '~120 MB',
      quantized: true
    }
  }
}

// ===== GLOBALE STATE =====
let currentLanguage = 'en'
let loadedModels = {
  en: { sentiment: null, embedding: null },
  de: { sentiment: null, embedding: null }
}
let isLoading = false
let loadError = null

export async function setLanguage(language) {
  if (!MODEL_CONFIGS[language]) {
    throw new Error(`Unsupported language: ${language}`)
  }
  currentLanguage = language
  return await loadModels(language)
}

export function getCurrentLanguage() {
  return currentLanguage
}

export async function loadModels(language = currentLanguage) {
  const models = loadedModels[language]
  if (models.sentiment && models.embedding) {
    console.log(`✅ Models for ${language.toUpperCase()} already loaded`)
    return { embeddingModel: models.embedding, sentimentModel: models.sentiment }
  }
  
  if (isLoading) {
    console.log('⏳ Waiting...')
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isLoading) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
    return { embeddingModel: models.embedding, sentimentModel: models.sentiment }
  }
  
  isLoading = true
  loadError = null
  
  const config = MODEL_CONFIGS[language]
  const langLabel = language === 'en' ? 'English' : 'Deutsch'
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 Loading ${langLabel} AI Models`)
  console.log(`${'='.repeat(70)}`)
  console.log('📂 Source: Hugging Face CDN')
  console.log('💾 Cached in browser (IndexedDB)')
  console.log('⚠️  First load: Download required')
  console.log('')
  
  try {
    // ===== SENTIMENT MODEL =====
    if (!models.sentiment) {
      console.log('\n📊 Sentiment Model...')
      console.log(`   ${config.sentiment.name}`)
      console.log(`   ${config.sentiment.size}`)
      
      const startTime = performance.now()
      
      models.sentiment = await pipeline(
        config.sentiment.task,
        config.sentiment.name,
        {
          quantized: config.sentiment.quantized,
          revision: 'main',
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              console.log(`   📦 ${progress.file}: ${Math.round(progress.progress || 0)}%`)
            } else if (progress.status === 'done') {
              console.log(`   ✅ ${progress.file}`)
            }
          }
        }
      )
      
      console.log(`✅ Loaded in ${((performance.now() - startTime) / 1000).toFixed(2)}s`)
    }
    
    // ===== EMBEDDING MODEL =====
    if (!models.embedding) {
      console.log('\n🧠 Embedding Model...')
      console.log(`   ${config.embedding.name}`)
      console.log(`   ${config.embedding.size}`)
      
      const startTime = performance.now()
      
      models.embedding = await pipeline(
        config.embedding.task,
        config.embedding.name,
        {
          quantized: config.embedding.quantized,
          revision: 'main',
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              console.log(`   📦 ${progress.file}: ${Math.round(progress.progress || 0)}%`)
            } else if (progress.status === 'done') {
              console.log(`   ✅ ${progress.file}`)
            }
          }
        }
      )
      
      console.log(`✅ Loaded in ${((performance.now() - startTime) / 1000).toFixed(2)}s`)
    }
    
    console.log(`\n🎉 ${langLabel} Models Ready!`)
    console.log('─'.repeat(70) + '\n')
    
    return { embeddingModel: models.embedding, sentimentModel: models.sentiment }
    
  } catch (error) {
    console.error('\n❌ FAILED')
    console.error('─'.repeat(70))
    console.error('Error:', error.message)
    console.log('')
    loadError = error
    throw error
  } finally {
    isLoading = false
  }
}

export function getModels() {
  const models = loadedModels[currentLanguage]
  return { 
    embeddingModel: models.embedding,
    sentimentModel: models.sentiment,
    isLoading,
    loadError,
    currentLanguage
  }
}

export function getLoadingStatus() {
  const models = loadedModels[currentLanguage]
  return {
    isLoading,
    error: loadError,
    modelsLoaded: !!(models.embedding && models.sentiment),
    sentimentReady: !!models.sentiment,
    embeddingReady: !!models.embedding,
    currentLanguage,
    availableLanguages: Object.keys(MODEL_CONFIGS)
  }
}

export function getAvailableLanguages() {
  return Object.keys(MODEL_CONFIGS)
}

export async function preloadLanguage(language) {
  if (!MODEL_CONFIGS[language]) return
  console.log(`🔄 Preloading ${language.toUpperCase()}...`)
  try {
    await loadModels(language)
  } catch (error) {
    console.warn(`⚠️ Preload failed:`, error)
  }
}

export async function testModels(language = currentLanguage) {
  console.log(`🧪 Testing ${language.toUpperCase()}`)
  
  try {
    await loadModels(language)
    const models = loadedModels[language]
    
    const testText = language === 'de' 
      ? "Das ist ein wunderschöner Tag!" 
      : "This is a wonderful day!"
    
    const sentiment = await models.sentiment(testText)
    const embedding = await models.embedding(testText, { pooling: 'mean', normalize: true })
    
    console.log('✅ Sentiment:', sentiment)
    console.log('✅ Embedding:', `${embedding.data.length}D`)
    return true
  } catch (error) {
    console.error('❌ Failed:', error)
    return false
  }
}

if (typeof window !== 'undefined') {
  window.__neuralBloomDebug = {
    loadModels,
    setLanguage,
    getCurrentLanguage,
    getModels,
    getLoadingStatus,
    testModels,
    MODEL_CONFIGS
  }
  console.log('💡 Debug: window.__neuralBloomDebug')
}