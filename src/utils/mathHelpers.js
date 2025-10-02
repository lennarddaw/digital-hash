export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function calculateVariance(array) {
  const mean = array.reduce((a, b) => a + b) / array.length
  const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length
  return Math.sqrt(variance)
}