const STORAGE_KEY = 'neural-bloom-creations'

export function saveCreation(bloomData, text) {
  const creations = getCreations()
  creations.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    text: text.slice(0, 100) + '...',
    bloomData
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creations))
}

export function getCreations() {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}