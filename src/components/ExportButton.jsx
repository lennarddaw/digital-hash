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
      className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg
                 font-medium transition-colors shadow-lg shadow-cyan-500/20"
    >
      Export as Image
    </button>
  )
}