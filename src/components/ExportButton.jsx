export default function ExportButton() {
  const handleExport = () => {
    // Screenshot functionality
    const canvas = document.querySelector('canvas')
    const link = document.createElement('a')
    link.download = `neural-bloom-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }
  
  return (
    <button
      onClick={handleExport}
      className="px-6 py-3 bg-white-500 hover:bg-white-600 rounded-lg border border-white/700
                 font-medium transition-colors shadow-lg shadow-white-500/20"
    >
      Snapshot
    </button>
  )
}