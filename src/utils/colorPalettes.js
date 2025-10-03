// src/utils/colorPalettes.js

/**
 * Farbpaletten pro Sentiment. Alle Farben sind bewusst deutlich unterscheidbar,
 * damit die Visualisierung sofort lesbar bleibt.
 */
export const PALETTES = {
  POSITIVE: [
    '#FFD700', // Gold
    '#FF6B6B', // Warm Red
    '#4ECDC4', // Turquoise
  ],
  NEGATIVE: [
    '#6C5CE7', // Purple
    '#00B4D8', // Cool Blue
    '#5A189A', // Deep Purple
  ],
  NEUTRAL: [
    '#9CA3AF', // Gray 400
    '#60A5FA', // Blue 400
    '#34D399', // Green 400
  ],
}

/**
 * Liefert eine Sentiment-Farbe. Optional können emotionHints (joy, anger, sadness, fear)
 * einen kleinen, deterministischen Bias auf die Palettenauswahl geben – transparent & erklärbar.
 *
 * @param {{label?: 'POSITIVE'|'NEGATIVE'|'NEUTRAL', score?: number}} sentiment
 * @param {{joy?: 0|1, anger?: 0|1, sadness?: 0|1, fear?: 0|1}} emotionHints
 * @returns {string} hex color
 */
export function sentimentToColor(sentiment, emotionHints = {}) {
  const safe = sentiment || { label: 'NEUTRAL', score: 0.5 }
  const label = safe.label || 'NEUTRAL'
  const score = typeof safe.score === 'number' ? safe.score : 0.5

  const palette =
    PALETTES[label] ||
    (label === 'POSITIVE' ? PALETTES.POSITIVE : label === 'NEGATIVE' ? PALETTES.NEGATIVE : PALETTES.NEUTRAL)

  // Emotion-Hints verschieben die Indexwahl leicht (deterministischer, kleiner Bias)
  const bias =
    (emotionHints.joy ? 1 : 0) +
    (emotionHints.anger ? 2 : 0) +
    (emotionHints.sadness ? -1 : 0) +
    (emotionHints.fear ? 0 : 0)

  const idx = Math.abs(Math.floor(score * palette.length + bias)) % palette.length
  return palette[idx]
}

/**
 * Tageszeit-Farbe (für subtile Überlagerungen oder UI-Deko).
 * Kann z. B. dezent mit mixColors() in die Strukturfarbe eingeflochten werden.
 */
export function timeOfDayColor() {
  const hour = new Date().getHours()

  if (hour < 6) return '#1a1a2e'   // Night
  if (hour < 12) return '#ffd97d'  // Morning
  if (hour < 18) return '#00b4d8'  // Day
  return '#e63946'                 // Evening
}

/**
 * Mischt zwei Hex-Farben linear (RGB).
 * @param {string} hexA - z. B. "#ff0000"
 * @param {string} hexB - z. B. "#0000ff"
 * @param {number} t - 0..1 (0 = A, 1 = B)
 * @returns {string} hex
 */
export function mixColors(hexA, hexB, t = 0.5) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a.r * (1 - t) + b.r * t)
  const g = Math.round(a.g * (1 - t) + b.g * t)
  const bl = Math.round(a.b * (1 - t) + b.b * t)
  return rgbToHex(r, g, bl)
}

/* ------------------ interne Helfer ------------------ */

function hexToRgb(hex) {
  const clean = hex?.replace('#', '') ?? '000000'
  const num = parseInt(clean.length === 3 ? expand3(clean) : clean, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => {
        const s = v.toString(16)
        return s.length === 1 ? '0' + s : s
      })
      .join('')
  )
}

function expand3(h) {
  return h
    .split('')
    .map((c) => c + c)
    .join('')
}
