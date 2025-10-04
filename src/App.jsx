// src/App.jsx
import { useState } from 'react'
import TextInput from './components/TextInput'
import BloomCanvas from './components/BloomCanvas'
import LoadingState from './components/LoadingState'
import ExportButton from './components/ExportButton'
import MusicPlayer from './components/MusicPlayer.jsx'
import useTextAnalysis from './hooks/useTextAnalysis'
import InspectPanel from './components/InspectPanel.jsx'

// Background-Auswahl (nur UI)
import BackgroundSelector from './components/BackgroundSelector.jsx'

export default function App() {
  const [userText, setUserText] = useState('')
  const [inspectTarget, setInspectTarget] = useState(null)
  const { bloomData, isAnalyzing, isModelLoading } = useTextAnalysis(userText)

  // Background-Type für die in-scene Umsetzung (Default: tiefschwarz)
  const [bgType, setBgType] = useState('solid-dark')

  const hasBloom = !!bloomData
  const meta = bloomData?.metadata
  const struct = bloomData?.structure

  return (
    <div className="w-full h-full relative">
      {/* 3D Canvas mit in-scene Background */}
      <BloomCanvas
        bloomData={bloomData}
        onInspect={setInspectTarget}
        bgType={bgType}
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none nice-scroll">
        <div className="pointer-events-auto p-8 max-w-2xl">
          <h1 className="text-4xl font-bold mb-2 text-white">
            Hash
          </h1>
          <p className="text-gray-400 mb-6">
            Transform your thoughts into living structures
          </p>

          {/* Background-Selector (steuert bgType für BloomCanvas) */}
          <div className="mb-4">
            <BackgroundSelector value={bgType} onChange={setBgType} />
          </div>

          <TextInput
            value={userText}
            onChange={setUserText}
            disabled={isAnalyzing}
          />

          {isModelLoading && <LoadingState type="model" />}
          {isAnalyzing && <LoadingState type="analysis" />}

          {/* Legende / Metriken – nur anzeigen, wenn Daten vorhanden sind */}
          {hasBloom && (
            <div className="pointer-events-auto p-4 mt-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm max-w-md">
              <div className="text-sm text-gray-200 grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <span className="text-gray-400">Sentiment:</span>{' '}
                  <span className="font-medium">
                    {meta?.sentiment ?? '—'}
                  </span>
                  {typeof meta?.confidence === 'number' && (
                    <span className="text-gray-400"> (confidence {meta.confidence.toFixed(2)})</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400">Words:</span>{' '}
                  <span className="font-medium">{meta?.wordCount ?? '—'}</span>
                </div>

                <div>
                  <span className="text-gray-400">Branches (#Sentences):</span>{' '}
                  <span className="font-medium">{struct?.branches ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Complexity:</span>{' '}
                  <span className="font-medium">{struct?.complexity ?? '—'}</span>
                </div>

                <div>
                  <span className="text-gray-400">Symmetry:</span>{' '}
                  <span className="font-medium">
                    {typeof struct?.symmetry === 'number' ? struct.symmetry.toFixed(2) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Angle (°):</span>{' '}
                  <span className="font-medium">
                    {typeof struct?.angle === 'number' ? struct.angle.toFixed(1) : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400">Question Score:</span>{' '}
                  <span className="font-medium">
                    {typeof meta?.questionScore === 'number' ? meta.questionScore.toFixed(2) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Emphasis:</span>{' '}
                  <span className="font-medium">
                    {typeof meta?.emphasisScore === 'number' ? meta.emphasisScore.toFixed(2) : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {hasBloom && (
          <>
            <div className="absolute top-6 right-8 pointer-events-auto flex items-start gap-4">
              <MusicPlayer
                className="w-80"
                playlist={[
                  { title: 'Emotional Ambient Pop', artist: 'EONA', src: '/audio/eona-emotional-ambient-pop-351436.mp3' },
                  { title: 'baroque-trap-412613',  artist: 'Local', src: '/audio/baroque-trap-412613.mp3' },
                  { title: 'gothic-black-metal-music',   artist: 'Local', src: '/audio/gothic-black-metal-music-no-copyright-383590.mp3' },
                  { title: 'kugelsicher',   artist: 'tremoxbeatz', src: '/audio/kugelsicher-by-tremoxbeatz-302838.mp3' },
                  { title: 'nocturne-hip-hop-chopin',   artist: 'Local', src: '/audio/nocturne-n20-hip-hop-chopin-160904.mp3' },
                  { title: 'beat-electronic-digital',   artist: 'the-last-point', src: '/audio/the-last-point-beat-electronic-digital-394291.mp3' },
                  { title: 'trap-basketball-beat-music',   artist: 'Local', src: '/audio/trap-basketball-beat-music-412802.mp3' },
                  { title: 'four-seasons-quotwinterquot',   artist: 'vivaldi', src: '/audio/vivaldi-four-seasons-quotwinterquot-rv-297-arr-for-strings-185593.mp3' }
                ]}
                autoPlay={false}
              />
            </div>

            <div className="absolute bottom-8 right-8 pointer-events-auto">
              <ExportButton />
            </div>
          </>
        )}
      </div>

      {/* Inspect Panel – erklärt, was angeklickt wurde */}
      <InspectPanel target={inspectTarget} onClose={() => setInspectTarget(null)} />
    </div>
  )
}