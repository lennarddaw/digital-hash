// src/utils/colorPalettes.js

/**
 * Farbpaletten pro Sentiment (Rückwärtskompatibilität).
 * Behalten wir bei, wird aber vom neuen HSL-Mapping ergänzt/übersteuert.
 */
export const PALETTES = {
  POSITIVE: ['#FFD700', '#FF6B6B', '#4ECDC4'],
  NEGATIVE: ['#6C5CE7', '#00B4D8', '#5A189A'],
  NEUTRAL:  ['#9CA3AF', '#60A5FA', '#34D399'],
}

/**
 * Liefert eine Sentiment-Farbe aus den Paletten.
 * Bleibt als Fallback bestehen – für das neue Mehrfarb-Konzept
 * nutzen wir bevorzugt HSL (siehe Helpers unten).
 */
export function sentimentToColor(sentiment, emotionHints = {}) {
  const safe = sentiment || { label: 'NEUTRAL', score: 0.5 }
  const label = safe.label || 'NEUTRAL'
  const score = typeof safe.score === 'number' ? safe.score : 0.5

  const palette =
    PALETTES[label] ||
    (label === 'POSITIVE' ? PALETTES.POSITIVE : label === 'NEGATIVE' ? PALETTES.NEGATIVE : PALETTES.NEUTRAL)

  // Emotion-Hints verschieben die Indexwahl leicht (deterministisch, klein)
  const bias =
    (emotionHints.joy ? 1 : 0) +
    (emotionHints.anger ? 2 : 0) +
    (emotionHints.sadness ? -1 : 0) +
    (emotionHints.fear ? 0 : 0)

  const idx = Math.abs(Math.floor(score * palette.length + bias)) % palette.length
  return palette[idx]
}

/**
 * Tageszeit-Farbe (UI-Deko / subtile Overlays).
 */
export function timeOfDayColor() {
  const hour = new Date().getHours()
  if (hour < 6)  return '#1a1a2e' // Night
  if (hour < 12) return '#ffd97d' // Morning
  if (hour < 18) return '#00b4d8' // Day
  return '#e63946'               // Evening
}

/**
 * Mischt zwei Hex-Farben linear (RGB).
 */
export function mixColors(hexA, hexB, t = 0.5) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a.r * (1 - t) + b.r * t)
  const g = Math.round(a.g * (1 - t) + b.g * t)
  const bl = Math.round(a.b * (1 - t) + b.b * t)
  return rgbToHex(r, g, bl)
}

/* =========================================================
   NEU: Utilities für bedeutungsgebundenes HSL-Farb-Mapping
   ========================================================= */

/** clamp auf 0..1 */
export function clamp01(x) { return Math.max(0, Math.min(1, x)) }

/** Hue auf 0..360 normalisieren */
export function wrapHue(h) { let x = h % 360; return x < 0 ? x + 360 : x }

/**
 * HSL → HEX
 * h in Grad (0..360), s/l in Prozent (0..100)
 */
export function hslToHex(h, sPct, lPct) {
  const s = clamp01((sPct ?? 0) / 100)
  const l = clamp01((lPct ?? 0) / 100)
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = wrapHue(h) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0, g = 0, b = 0
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2)       [r, g, b] = [x, c, 0]
  else if (hp < 3)       [r, g, b] = [0, c, x]
  else if (hp < 4)       [r, g, b] = [0, x, c]
  else if (hp < 5)       [r, g, b] = [x, 0, c]
  else                   [r, g, b] = [c, 0, x]
  const m = l - c / 2
  return rgbToHexFloat(r + m, g + m, b + m)
}

/** Bequemer Helper: direkt HSL als THREE/Hex verwenden */
export function colorFromHSL(h, sPct, lPct) {
  return hslToHex(h, sPct, lPct)
}

/**
 * (Optional) Emotions-Tints für feine Einmischung.
 * Werte sind kleine Hue/Sat-Nudges, die du bei starken Hints addierst.
 */
export const EMOTION_TINTS = {
  joy:     { hue: +8,  sat: +6,  light: +4 },
  anger:   { hue: +14, sat: +8,  light: -4 },
  sadness: { hue: -10, sat: +4,  light: -6 },
  fear:    { hue: -6,  sat: +5,  light: -2 },
}

/**
 * (Optional) Worttyp-Bias für Hue – konsistent nutzbar in bloomMapper.
 */
export function typeHueBias(tag) {
  switch (tag) {
    case 'NAME':   return 10
    case 'NUMBER':
    case 'DATE':   return 6
    case 'URL':    return -12
    default:       return 0
  }
}

/* ------------------ RGB/HEX Helfer (exportiert) ------------------ */

export function hexToRgb(hex) {
  const clean = hex?.replace('#', '') ?? '000000'
  const num = parseInt(clean.length === 3 ? expand3(clean) : clean, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHex(r, g, b) {
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

/* interne Variante für Float-RGB (0..1) */
function rgbToHexFloat(r, g, b) {
  const toHex = (v) => ('0' + Math.round(clamp01(v) * 255).toString(16)).slice(-2)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function expand3(h) {
  return h.split('').map((c) => c + c).join('')
}