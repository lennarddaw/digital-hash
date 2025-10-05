// src/App.jsx
import { useState, useEffect } from 'react'
import TextInput from './components/TextInput'
import BloomCanvas from './components/BloomCanvas'
import LoadingState from './components/LoadingState'
import ExportButton from './components/ExportButton'
import MusicPlayer from './components/MusicPlayer.jsx'
import useTextAnalysis from './hooks/useTextAnalysis'
import InspectPanel from './components/InspectPanel.jsx'
import BackgroundSelector from './components/BackgroundSelector.jsx'
import FocusModeToggle from './components/FocusModeToggle.jsx'
import TechnicalInfoPanel from './components/TechnicalInfoPanel.jsx'

export default function App() {
  const [userText, setUserText] = useState('')
  const [inspectTarget, setInspectTarget] = useState(null)
  const [bgType, setBgType] = useState('solid-dark')
  const [focusMode, setFocusMode] = useState(false)

  const { bloomData, isAnalyzing, isModelLoading } = useTextAnalysis(userText)

  const hasBloom = !!bloomData
  const meta = bloomData?.metadata
  const struct = bloomData?.structure

  // Creator configuration from environment variables
  const CREATOR_NAME = import.meta.env.VITE_CREATOR_NAME || 'lennarddaw'
  const REPO_URL = import.meta.env.VITE_REPO_URL || 'https://github.com/lennarddaw/digital-hash'

  // Unified width for music player and creator line
  const MUSIC_WIDTH = 'w-80' // 20rem; adjust centrally if needed

  // Keyboard shortcuts for Focus Mode
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Toggle focus mode with 'F' key (when not typing in input fields)
      if ((e.key === 'f' || e.key === 'F') && 
          e.target.tagName !== 'TEXTAREA' && 
          e.target.tagName !== 'INPUT') {
        e.preventDefault()
        setFocusMode(prev => !prev)
      }
      
      // Exit focus mode with Escape
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault()
        setFocusMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [focusMode])

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* 3D Canvas with in-scene background */}
      <BloomCanvas
        bloomData={bloomData}
        onInspect={setInspectTarget}
        bgType={bgType}
      />

      {/* Focus Mode Toggle - Always visible at center top */}
      <FocusModeToggle 
        isFocused={focusMode} 
        onToggle={() => setFocusMode(prev => !prev)} 
      />

      {/* ============ LEFT SIDE UI OVERLAY ============ */}
      <div 
        className={`absolute inset-0 pointer-events-none nice-scroll
                    transition-transform duration-700 ease-in-out
                    ${focusMode ? '-translate-x-full' : 'translate-x-0'}`}
      >
        <div className="pointer-events-auto p-8 max-w-2xl">
          {/* Header */}
          <h1 className="text-4xl font-bold mb-2 text-white">
            Hash
          </h1>
          <p className="text-gray-400 mb-6">
            Transform your thoughts into living structures
          </p>

          {/* Background Selector */}
          <div className="mb-4">
            <BackgroundSelector value={bgType} onChange={setBgType} />
          </div>

          {/* Text Input */}
          <TextInput
            value={userText}
            onChange={setUserText}
            disabled={isAnalyzing}
          />

          {/* Loading States */}
          {isModelLoading && <LoadingState type="model" />}
          {isAnalyzing && <LoadingState type="analysis" />}


          {/* Metrics Panel - Only visible when bloom data exists */}
          {hasBloom && (
            <div className="pointer-events-auto p-4 mt-4 bg-white/5 border border-white/10 
                            rounded-lg backdrop-blur-sm max-w-md">
              <div className="text-sm text-gray-200 grid grid-cols-2 gap-x-6 gap-y-2">
                
                <div>
                  <span className="text-gray-400">Sentiment:</span>{' '}
                  <span className="font-medium">
                    {meta?.sentiment ?? '—'}
                  </span>
                  {typeof meta?.confidence === 'number' && (
                    <span className="text-gray-400">
                      {' '}(confidence {meta.confidence.toFixed(2)})
                    </span>
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
                    {typeof struct?.symmetry === 'number' 
                      ? struct.symmetry.toFixed(2) 
                      : '—'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-400">Angle (°):</span>{' '}
                  <span className="font-medium">
                    {typeof struct?.angle === 'number' 
                      ? struct.angle.toFixed(1) 
                      : '—'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400">Question Score:</span>{' '}
                  <span className="font-medium">
                    {typeof meta?.questionScore === 'number' 
                      ? meta.questionScore.toFixed(2) 
                      : '—'}
                  </span>
                </div>
                
                <div>
                  <span className="text-gray-400">Emphasis:</span>{' '}
                  <span className="font-medium">
                    {typeof meta?.emphasisScore === 'number' 
                      ? meta.emphasisScore.toFixed(2) 
                      : '—'}
                  </span>
                </div>

              </div>
            </div>
          )}

                    {/* Technical Info Button - Always visible, enabled when data exists */}
          <div className="mt-4">
            <TechnicalInfoPanel bloomData={bloomData} />
          </div>
        </div>
      </div>

      {/* ============ RIGHT SIDE UI OVERLAY ============ */}
      {hasBloom && (
        <>
          {/* Music Player + Creator Line - Top Right */}
          <div 
            className={`absolute top-6 right-8 pointer-events-auto
                        flex flex-col items-end
                        transition-transform duration-700 ease-in-out
                        ${focusMode ? 'translate-x-[calc(100%+2rem)]' : 'translate-x-0'}`}
          >
            {/* Unified width wrapper */}
            <div className={`${MUSIC_WIDTH} flex flex-col items-stretch`}>
              
              {/* Music Player */}
              <MusicPlayer
                className={`${MUSIC_WIDTH}`}
                playlist={[
                  { 
                    title: 'Emotional Ambient Pop', 
                    artist: 'EONA', 
                    src: '/audio/eona-emotional-ambient-pop-351436.mp3' 
                  },
                  { 
                    title: 'baroque-trap-412613', 
                    artist: 'Local', 
                    src: '/audio/baroque-trap-412613.mp3' 
                  },
                  { 
                    title: 'gothic-black-metal-music', 
                    artist: 'Local', 
                    src: '/audio/gothic-black-metal-music-no-copyright-383590.mp3' 
                  },
                  { 
                    title: 'kugelsicher', 
                    artist: 'tremoxbeatz', 
                    src: '/audio/kugelsicher-by-tremoxbeatz-302838.mp3' 
                  },
                  { 
                    title: 'nocturne-hip-hop-chopin', 
                    artist: 'Local', 
                    src: '/audio/nocturne-n20-hip-hop-chopin-160904.mp3' 
                  },
                  { 
                    title: 'beat-electronic-digital', 
                    artist: 'the-last-point', 
                    src: '/audio/the-last-point-beat-electronic-digital-394291.mp3' 
                  },
                  { 
                    title: 'trap-basketball-beat-music', 
                    artist: 'Local', 
                    src: '/audio/trap-basketball-beat-music-412802.mp3' 
                  },
                  { 
                    title: 'four-seasons-quotwinterquot', 
                    artist: 'vivaldi', 
                    src: '/audio/vivaldi-four-seasons-quotwinterquot-rv-297-arr-for-strings-185593.mp3' 
                  }
                ]}
                autoPlay={false}
              />

              {/* Subtle Creator Line - Same width as player, centered */}
              <div className="mt-1 text-[11px] md:text-xs text-gray-400/70 
                              hover:text-gray-200/90 transition-colors text-center">
                <span>by {CREATOR_NAME} · </span>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 decoration-white/20 
                             hover:decoration-white/60"
                  title="Open Source Repository"
                >
                  Open Source on GitHub
                </a>
                <span className="ml-1">· PRs welcome</span>
              </div>
            </div>
          </div>

          {/* Export Button - Bottom Right */}
          <div 
            className={`absolute bottom-8 right-8 pointer-events-auto
                        transition-transform duration-700 ease-in-out
                        ${focusMode ? 'translate-x-[calc(100%+2rem)]' : 'translate-x-0'}`}
          >
            <ExportButton />
          </div>
        </>
      )}

      {/* ============ INSPECT PANEL - Bottom Left ============ */}
      <div 
        className={`transition-transform duration-700 ease-in-out
                    ${focusMode ? '-translate-x-[calc(100%+2rem)]' : 'translate-x-0'}`}
      >
        <InspectPanel 
          target={inspectTarget} 
          onClose={() => setInspectTarget(null)} 
        />
      </div>
    </div>
  )
}