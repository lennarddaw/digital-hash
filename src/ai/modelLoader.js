// src/ai/modelLoader.js
import { pipeline, env } from '@xenova/transformers'

// ===== KONFIGURATION FÜR LOKALE + REMOTE MODELLE =====
env.allowLocalModels = true   // WICHTIG: Lokale Modelle erlauben
env.allowRemoteModels = true
env.useBrowserCache = true
env.useCustomCache = false

// CDN für Remote-Downloads
env.remoteHost = 'https://huggingface.co'
env.remotePathTemplate = '{model}/resolve/{revision}/'

// ===== MODEL KONFIGURATIONEN =====
const MODEL_CONFIGS = {
  en: {
    sentiment: {
      name: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      task: 'sentiment-analysis',
      size: '~260 MB',
      quantized: true,
      local: false  // Remote von Hugging Face
    },
    embedding: {
      name: 'Xenova/all-MiniLM-L6-v2',
      task: 'feature-extraction',
      size: '~90 MB',
      quantized: true,
      local: false  // Remote von Hugging Face
    }
  },
  de: {
    sentiment: {
      name: 'sentiment_de',
      task: 'sentiment-analysis',
      size: '~420 MB',
      quantized: false,  // Nicht-quantifiziert (model.onnx)
      local: true
    },
    embedding: {
      name: 'embedding_de',
      task: 'feature-extraction',
      size: '~120 MB',
      quantized: false,  // Nicht-quantifiziert (model.onnx)
      local: true
    }
  }
}

// ===== GLOBALE STATE VARIABLEN =====
let currentLanguage = 'en'
let loadedModels = {
  en: { sentiment: null, embedding: null },
  de: { sentiment: null, embedding: null }
}
let isLoading = false
let loadError = null

/**
 * Setzt die aktuelle Sprache und lädt die entsprechenden Modelle
 * @param {string} language - 'en' oder 'de'
 * @returns {Promise<Object>} { embeddingModel, sentimentModel }
 */
export async function setLanguage(language) {
  if (!MODEL_CONFIGS[language]) {
    throw new Error(`Unsupported language: ${language}`)
  }
  
  currentLanguage = language
  return await loadModels(language)
}

/**
 * Gibt die aktuelle Sprache zurück
 * @returns {string} Aktuelle Sprache ('en' oder 'de')
 */
export function getCurrentLanguage() {
  return currentLanguage
}

/**
 * Lädt die Modelle für die angegebene Sprache
 * @param {string} language - 'en' oder 'de'
 * @returns {Promise<Object>} { embeddingModel, sentimentModel }
 */
export async function loadModels(language = currentLanguage) {
  // Bereits geladen? Return sofort
  const models = loadedModels[language]
  if (models.sentiment && models.embedding) {
    console.log(`✅ Models for ${language.toUpperCase()} already loaded from cache`)
    return { 
      embeddingModel: models.embedding, 
      sentimentModel: models.sentiment 
    }
  }
  
  // Warten falls bereits am Laden
  if (isLoading) {
    console.log('⏳ Models already loading, waiting...')
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isLoading) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
    return { 
      embeddingModel: models.embedding, 
      sentimentModel: models.sentiment 
    }
  }
  
  isLoading = true
  loadError = null
  
  const config = MODEL_CONFIGS[language]
  const langLabel = language === 'en' ? 'English' : 'Deutsch'
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 Loading AI Models for ${langLabel}`)
  console.log(`${'='.repeat(70)}`)
  console.log(`📂 Source: ${config.sentiment.local ? 'Local files' : 'Hugging Face CDN'}`)
  console.log('💾 Models will be cached in browser storage')
  if (!config.sentiment.local) {
    console.log('⚠️  First load: Download required (one-time only!)')
  }
  console.log('')
  
  try {
    // ===== 1. SENTIMENT ANALYSIS MODEL =====
    if (!models.sentiment) {
      console.log('\n📊 Loading Sentiment Model...')
      console.log(`   Model: ${config.sentiment.name}`)
      console.log(`   Size: ${config.sentiment.size}`)
      console.log(`   Source: ${config.sentiment.local ? 'Local' : 'Remote'}`)
      
      const sentimentStartTime = performance.now()
      
      models.sentiment = await pipeline(
        config.sentiment.task,
        config.sentiment.name,
        {
          quantized: config.sentiment.quantized,
          revision: 'main',
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              const percent = Math.round(progress.progress || 0)
              console.log(`   📦 ${progress.file}: ${percent}%`)
            } else if (progress.status === 'done') {
              console.log(`   ✅ ${progress.file} loaded`)
            }
          }
        }
      )
      
      const sentimentLoadTime = ((performance.now() - sentimentStartTime) / 1000).toFixed(2)
      console.log(`✅ Sentiment Model loaded in ${sentimentLoadTime}s`)
    }
    
    // ===== 2. EMBEDDING MODEL =====
    if (!models.embedding) {
      console.log('\n🧠 Loading Embedding Model...')
      console.log(`   Model: ${config.embedding.name}`)
      console.log(`   Size: ${config.embedding.size}`)
      console.log(`   Source: ${config.embedding.local ? 'Local' : 'Remote'}`)
      
      const embeddingStartTime = performance.now()
      
      models.embedding = await pipeline(
        config.embedding.task,
        config.embedding.name,
        {
          quantized: config.embedding.quantized,
          revision: 'main',
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              const percent = Math.round(progress.progress || 0)
              console.log(`   📦 ${progress.file}: ${percent}%`)
            } else if (progress.status === 'done') {
              console.log(`   ✅ ${progress.file} loaded`)
            }
          }
        }
      )
      
      const embeddingLoadTime = ((performance.now() - embeddingStartTime) / 1000).toFixed(2)
      console.log(`✅ Embedding Model loaded in ${embeddingLoadTime}s`)
    }
    
    // ===== SUCCESS =====
    console.log(`\n🎉 ALL MODELS LOADED SUCCESSFULLY! (${langLabel})`)
    console.log('─'.repeat(70))
    console.log('📊 Sentiment Model:', models.sentiment ? '✅ Ready' : '❌ Failed')
    console.log('🧠 Embedding Model:', models.embedding ? '✅ Ready' : '❌ Failed')
    console.log('─'.repeat(70) + '\n')
    
    return { 
      embeddingModel: models.embedding, 
      sentimentModel: models.sentiment 
    }
    
  } catch (error) {
    console.error('\n❌ FAILED TO LOAD MODELS')
    console.error('─'.repeat(70))
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    console.log('\n🔍 DEBUGGING INFO:')
    if (config.sentiment.local) {
      console.log('Local models should be in:')
      console.log('  - public/models/sentiment_de/')
      console.log('  - public/models/embedding_de/')
      console.log('Files required: config.json, tokenizer.json, onnx/model_quantized.onnx')
    } else {
      console.log('Models are loaded from Hugging Face CDN')
      console.log('and cached in browser (IndexedDB)')
    }
    console.log('')
    
    loadError = error
    throw error
    
  } finally {
    isLoading = false
  }
}

/**
 * Gibt die aktuell geladenen Modelle zurück
 * @returns {Object} { embeddingModel, sentimentModel, isLoading, loadError, currentLanguage }
 */
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

/**
 * Gibt den aktuellen Loading-Status zurück
 * @returns {Object}
 */
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

/**
 * Gibt alle verfügbaren Sprachen zurück
 * @returns {Array<string>}
 */
export function getAvailableLanguages() {
  return Object.keys(MODEL_CONFIGS)
}

/**
 * Pre-load Modelle für eine Sprache im Hintergrund
 * @param {string} language
 */
export async function preloadLanguage(language) {
  if (!MODEL_CONFIGS[language]) return
  
  console.log(`🔄 Preloading ${language.toUpperCase()} models in background...`)
  
  try {
    await loadModels(language)
    console.log(`✅ ${language.toUpperCase()} models preloaded successfully`)
  } catch (error) {
    console.warn(`⚠️ Failed to preload ${language.toUpperCase()} models:`, error)
  }
}

/**
 * Test-Funktion
 */
export async function testModels(language = currentLanguage) {
  console.log(`🧪 TESTING MODEL SETUP (${language.toUpperCase()})`)
  console.log('─'.repeat(70))
  
  console.log('\n1️⃣ Loading models...')
  try {
    await loadModels(language)
    console.log('  ✅ Models loaded successfully!')
    
    const models = loadedModels[language]
    
    console.log('\n2️⃣ Testing model inference...')
    
    const testText = language === 'de' 
      ? "Das ist ein wunderschöner Tag!" 
      : "This is a wonderful day!"
    
    console.log(`  Testing sentiment with: "${testText}"`)
    const sentimentResult = await models.sentiment(testText)
    console.log('  Result:', sentimentResult)
    
    console.log(`  Testing embedding with: "${testText}"`)
    const embeddingResult = await models.embedding(testText, { 
      pooling: 'mean', 
      normalize: true 
    })
    console.log(`  Result: ${embeddingResult.data.length}-dimensional vector`)
    
    console.log('\n✅ ALL TESTS PASSED!')
    return true
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error)
    return false
  }
}

// Debug Export
if (typeof window !== 'undefined') {
  window.__neuralBloomDebug = {
    loadModels,
    setLanguage,
    getCurrentLanguage,
    getModels,
    getLoadingStatus,
    getAvailableLanguages,
    preloadLanguage,
    testModels,
    MODEL_CONFIGS
  }
  console.log('💡 Debug functions available: window.__neuralBloomDebug')
  console.log('   Try: await window.__neuralBloomDebug.testModels("de")')
}