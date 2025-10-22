// src/utils/storageManager.js

const STORAGE_KEY = 'neural-bloom-creations'
const MODEL_LANGUAGE_KEY = 'neural-bloom-model-language'

// ===== MODEL LANGUAGE PREFERENCE =====

/**
 * Speichert die Model-Language Präferenz
 * @param {string} language - 'en' oder 'de'
 */
export function setModelLanguagePreference(language) {
  try {
    localStorage.setItem(MODEL_LANGUAGE_KEY, language)
  } catch (error) {
    console.warn('Failed to save model language preference:', error)
  }
}

/**
 * Lädt die gespeicherte Model-Language Präferenz
 * @returns {string} Gespeicherte Sprache oder 'en' als default
 */
export function getModelLanguagePreference() {
  try {
    const saved = localStorage.getItem(MODEL_LANGUAGE_KEY)
    return saved || 'en'
  } catch (error) {
    console.warn('Failed to load model language preference:', error)
    return 'en'
  }
}

// ===== CREATIONS MANAGEMENT =====

/**
 * Speichert eine Creation
 * @param {Object} bloomData - Bloom visualization data
 * @param {string} text - Original user text
 * @param {string} modelLanguage - Verwendete Model-Sprache
 */
export function saveCreation(bloomData, text, modelLanguage = 'en') {
  try {
    const creations = getCreations()
    creations.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
      bloomData,
      modelLanguage
    })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creations))
  } catch (error) {
    console.warn('Failed to save creation:', error)
  }
}

/**
 * Lädt alle gespeicherten Creations
 * @returns {Array} Array von Creation-Objekten
 */
export function getCreations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.warn('Failed to load creations:', error)
    return []
  }
}

/**
 * Löscht eine Creation
 * @param {number} id - ID der zu löschenden Creation
 */
export function deleteCreation(id) {
  try {
    const creations = getCreations().filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creations))
  } catch (error) {
    console.warn('Failed to delete creation:', error)
  }
}

/**
 * Löscht alle Creations
 */
export function clearCreations() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear creations:', error)
  }
}

/**
 * Exportiert alle Creations als JSON
 * @returns {string} JSON String aller Creations
 */
export function exportCreationsAsJSON() {
  const creations = getCreations()
  return JSON.stringify(creations, null, 2)
}

/**
 * Importiert Creations aus JSON
 * @param {string} jsonString - JSON String mit Creations
 * @returns {boolean} Erfolgreich importiert
 */
export function importCreationsFromJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString)
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array')
    }
    
    const existing = getCreations()
    const merged = [...existing, ...imported]
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    return true
  } catch (error) {
    console.error('Failed to import creations:', error)
    return false
  }
}