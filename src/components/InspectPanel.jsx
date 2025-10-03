// src/components/InspectPanel.jsx
/* eslint-disable react/prop-types */
function InspectPanel({ target, onClose }) {
  if (!target) return null
  const { kind, title, details, mapping } = target
  return (
    <div className="pointer-events-auto fixed bottom-8 left-8 max-w-md p-4 bg-black/60 text-gray-100 border border-white/10 rounded-lg shadow-lg backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{kind}</div>
      <div className="text-lg font-semibold mb-2">{title}</div>
      <div className="space-y-1 text-sm">
        {Object.entries(details || {}).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <span className="text-gray-400">{k}</span>
            <span className="font-medium">{String(v)}</span>
          </div>
        ))}
      </div>
      {mapping && (
        <div className="mt-3 text-xs text-gray-400">
          <div className="font-semibold mb-1">Warum so / warum dort?</div>
          <ul className="list-disc ml-5 space-y-1">
            {mapping.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      <button
        onClick={onClose}
        className="mt-3 text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20"
      >
        Schließen
      </button>
    </div>
  )
}

// Export both, to satisfy any import shape
export default InspectPanel
export { InspectPanel }
