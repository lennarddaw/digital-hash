export function sentimentToColor(sentiment) {
  const { label, score } = sentiment
  
  const palettes = {
    POSITIVE: [
      '#FFD700', // Gold
      '#FF6B6B', // Warm Red
      '#4ECDC4', // Turquoise
    ],
    NEGATIVE: [
      '#6C5CE7', // Purple
      '#00B4D8', // Cool Blue
      '#5A189A', // Deep Purple
    ]
  }
  
  const colors = palettes[label] || palettes.POSITIVE
  return colors[Math.floor(score * colors.length)]
}

export function timeOfDayColor() {
  const hour = new Date().getHours()
  
  if (hour < 6) return '#1a1a2e'      // Night
  if (hour < 12) return '#ffd97d'     // Morning
  if (hour < 18) return '#00b4d8'     // Day
  return '#e63946'                     // Evening
}