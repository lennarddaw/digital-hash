// src/App.jsx
import { useState } from 'react'
import TextInput from './components/TextInput'
import BloomCanvas from './components/BloomCanvas'
import LoadingState from './components/LoadingState'
import ExportButton from './components/ExportButton'
import useTextAnalysis from './hooks/useTextAnalysis'

export default function App() {
  const [userText, setUserText] = useState('')
  const { bloomData, isAnalyzing, isModelLoading } = useTextAnalysis(userText)

  const hasBloom = !!bloomData
  const meta = bloomData?.metadata
  const struct = bloomData?.structure

  return (
    <div className="w-full h-full relative">
      {/* 3D Background */}
      <BloomCanvas bloomData={bloomData} />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto p-8 max-w-2xl">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Neural Bloom
          </h1>
          <p className="text-gray-400 mb-6">
            Transform your thoughts into living structures
          </p>

          <TextInput
            value={userText}
            onChange={setUserText}
            disabled={isAnalyzing}
          />

          {isModelLoading && <LoadingState type="model" />}
          {isAnalyzing && <LoadingState type="analysis" />}

          {/* Legende / Metriken – nur anzeigen, wenn Daten vorhanden sind */}
          {hasBloom && (
            <div className="pointer-events-auto p-4 mt-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
              <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                Mapping · alles hat Bedeutung
              </div>

              <div className="text-sm text-gray-200 grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <span className="text-gray-400">Sentiment:</span>{' '}
                  <span className="font-medium">
                    {meta?.sentiment ?? '—'}
                  </span>
                  {typeof meta?.confidence === 'number' && (
                    <span className="text-gray-400"> (conf {meta.confidence.toFixed(2)})</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400">Wörter:</span>{' '}
                  <span className="font-medium">{meta?.wordCount ?? '—'}</span>
                </div>

                <div>
                  <span className="text-gray-400">Äste (#Sätze):</span>{' '}
                  <span className="font-medium">{struct?.branches ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Komplexität:</span>{' '}
                  <span className="font-medium">{struct?.complexity ?? '—'}</span>
                </div>

                <div>
                  <span className="text-gray-400">Symmetrie (TTR):</span>{' '}
                  <span className="font-medium">
                    {typeof struct?.symmetry === 'number' ? struct.symmetry.toFixed(2) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Winkel (°):</span>{' '}
                  <span className="font-medium">
                    {typeof struct?.angle === 'number' ? struct.angle.toFixed(1) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400">Frage-Intensität:</span>{' '}
                  <span className="font-medium">
                    {typeof meta?.questionScore === 'number' ? meta.questionScore.toFixed(2) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Betonung:</span>{' '}
                  <span className="font-medium">
                    {typeof meta?.emphasisScore === 'number' ? meta.emphasisScore.toFixed(2) : '—'}
                  </span>
                </div>
              </div>

              {/* kleine Mapping-Notizen */}
              {meta?.mappingNotes && (
                <div className="mt-3 text-xs text-gray-400 grid grid-cols-2 gap-2 leading-relaxed">
                  <div>Äste: {meta.mappingNotes.branches}</div>
                  <div>Komplexität: {meta.mappingNotes.complexity}</div>
                  <div>Symmetrie: {meta.mappingNotes.symmetry}</div>
                  <div>Winkel: {meta.mappingNotes.angle}</div>
                  <div>Farbe: {meta.mappingNotes.color}</div>
                  <div>Energie: {meta.mappingNotes.energy}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {hasBloom && (
          <div className="absolute bottom-8 right-8 pointer-events-auto">
            <ExportButton />
          </div>
        )}
      </div>
    </div>
  )
}