import { useState } from 'react'
import { Download } from 'lucide-react'

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    setMessage('')

    try {
      // Finde das Three.js Canvas (preserveDrawingBuffer: true ist bereits gesetzt)
      const canvas = document.querySelector('canvas')
      
      if (!canvas) {
        throw new Error('Canvas not found')
      }

      // Erstelle PNG aus Canvas
      const dataURL = canvas.toDataURL('image/png', 1.0)
      
      // Download-Link erstellen
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      link.download = `hash-${timestamp}.png`
      link.href = dataURL
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Success feedback
      setMessage('✓ Saved')
      setTimeout(() => setMessage(''), 2000)
      
    } catch (error) {
      console.error('Export failed:', error)
      setMessage('✗ Failed')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="group px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20
                   font-medium transition-all shadow-lg backdrop-blur-sm
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
        title="Save current view as PNG"
      >
        <Download 
          size={18} 
          className={`transition-transform ${isExporting ? 'animate-bounce' : 'group-hover:translate-y-0.5'}`}
        />
        <span className="text-white">
          {isExporting ? 'Saving...' : 'Snapshot'}
        </span>
      </button>
      
      {message && (
        <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap
                        ${message.includes('✓') ? 'bg-green-500/90' : 'bg-red-500/90'} text-white`}>
          {message}
        </div>
      )}
    </div>
  )
}