import { pipeline, env } from '@xenova/transformers'

// ===== KONFIGURATION FÜR REMOTE MODELLE (mit Browser Cache) =====
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true
env.useCustomCache = false

// CDN für schnellere Downloads
env.remoteHost = 'https://huggingface.co'
env.remotePathTemplate = '{model}/resolve/{revision}/'

// Globale Variablen
let embeddingModel = null
let sentimentModel = null
let isLoading = false
let loadError = null

/**
 * Lädt beide AI-Modelle von /public/models/
 * @returns {Promise<Object>} { embeddingModel, sentimentModel }
 */
export async function loadModels() {
  // Bereits geladen? Return sofort
  if (embeddingModel && sentimentModel) {
    console.log('✅ Models already loaded from cache')
    return { embeddingModel, sentimentModel }
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
    return { embeddingModel, sentimentModel }
  }
  
  isLoading = true
  loadError = null
  
  console.log('🚀 Loading AI models from Hugging Face...')
  console.log('📂 Models will be cached in browser storage')
  console.log('⚠️  First load: ~350 MB download (one-time only!)')
  console.log('')
  
  try {
    // ===== 1. SENTIMENT ANALYSIS MODEL =====
    if (!sentimentModel) {
      console.log('\n📊 Loading Sentiment Model...')
      console.log('   Model: Xenova/distilbert-base-uncased-finetuned-sst-2-english')
      console.log('   Size: ~260 MB')
      
      const sentimentStartTime = performance.now()
      
      sentimentModel = await pipeline(
        'sentiment-analysis',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        {
          quantized: true,
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
    if (!embeddingModel) {
      console.log('\n🧠 Loading Embedding Model...')
      console.log('   Model: Xenova/all-MiniLM-L6-v2')
      console.log('   Size: ~90 MB')
      
      const embeddingStartTime = performance.now()
      
      embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          quantized: true,
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
    console.log('\n🎉 ALL MODELS LOADED SUCCESSFULLY!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Sentiment Model:', sentimentModel ? '✅ Ready' : '❌ Failed')
    console.log('🧠 Embedding Model:', embeddingModel ? '✅ Ready' : '❌ Failed')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    return { embeddingModel, sentimentModel }
    
  } catch (error) {
    console.error('\n❌ FAILED TO LOAD MODELS')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    console.log('\n🔍 DEBUGGING INFO:')
    console.log('Models are loaded from Hugging Face CDN')
    console.log('and cached in browser (IndexedDB)')
    console.log('')
    console.log('First load: ~350 MB download (one-time)')
    console.log('After that: Instant loading from cache')
    console.log('')
    
    loadError = error
    throw error
    
  } finally {
    isLoading = false
  }
}

/**
 * Gibt die aktuell geladenen Modelle zurück
 * @returns {Object} { embeddingModel, sentimentModel, isLoading, loadError }
 */
export function getModels() {
  return { 
    embeddingModel, 
    sentimentModel, 
    isLoading, 
    loadError 
  }
}

/**
 * Gibt den aktuellen Loading-Status zurück
 * @returns {Object} { isLoading, error, modelsLoaded, sentimentReady, embeddingReady }
 */
export function getLoadingStatus() {
  return {
    isLoading,
    error: loadError,
    modelsLoaded: !!(embeddingModel && sentimentModel),
    sentimentReady: !!sentimentModel,
    embeddingReady: !!embeddingModel
  }
}

/**
 * Test-Funktion zum Überprüfen der Modelle
 */
export async function testModels() {
  console.log('🧪 TESTING MODEL SETUP')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  console.log('\n1️⃣ Loading models...')
  try {
    await loadModels()
    console.log('  ✅ Models loaded successfully!')
    
    // Test Model Inference
    console.log('\n2️⃣ Testing model inference...')
    
    // Test Sentiment
    const testText = "This is a wonderful day!"
    console.log(`  Testing sentiment with: "${testText}"`)
    const sentimentResult = await sentimentModel(testText)
    console.log('  Result:', sentimentResult)
    
    // Test Embedding
    console.log(`  Testing embedding with: "${testText}"`)
    const embeddingResult = await embeddingModel(testText, { 
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

// Export für Debug-Zwecke
if (typeof window !== 'undefined') {
  window.__neuralBloomDebug = {
    loadModels,
    getModels,
    getLoadingStatus,
    testModels
  }
  console.log('💡 Debug functions available: window.__neuralBloomDebug')
  console.log('   Try: await window.__neuralBloomDebug.testModels()')
}