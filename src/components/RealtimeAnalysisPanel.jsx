// src/components/RealtimeAnalysisPanel.jsx
import { useState } from 'react'
import { 
  Zap, Hash, Layers, TrendingUp, Circle, 
  Eye, EyeOff, Sparkles, Activity 
} from 'lucide-react'

/**
 * Interaktive Echtzeit-Visualisierung des Analyseprozesses
 * Zeigt genau wie jedes Wort/Satz zur finalen Struktur beiträgt
 */
export default function RealtimeAnalysisPanel({ 
  bloomData, 
  analysisResult,
  isVisible = true,
  onToggle 
}) {
  const [activeView, setActiveView] = useState('tokens')
  const [hoveredToken, setHoveredToken] = useState(null)
  const [selectedSentence, setSelectedSentence] = useState(null)

  if (!analysisResult || !bloomData) {
    return (
      <div className="bg-black/40 rounded-xl p-6 border border-white/10 text-center">
        <Sparkles className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="text-gray-400 text-sm">Enter text to see analysis...</p>
      </div>
    )
  }

  const { tokens = [], sentences = [], stats = {}, embedding = [] } = analysisResult
  const { structure = {}, metadata = {} } = bloomData

  // Filter echte Wörter (keine Punctuation)
  const words = tokens.filter(t => t.typeTag !== 'PUNCT')

  // ==================== Color Helpers ====================
  
  const getSalienceColor = (salience) => {
    const s = Math.max(0, Math.min(1, salience || 0))
    const hue = 200
    const sat = 70 + s * 30
    const light = 40 + s * 40
    return `hsl(${hue}, ${sat}%, ${light}%)`
  }

  const getSentimentColor = (signedSentiment) => {
    const s = signedSentiment || 0
    if (s > 0.15) return 'rgb(34, 197, 94)' // green
    if (s < -0.15) return 'rgb(239, 68, 68)' // red
    return 'rgb(156, 163, 175)' // gray
  }

  const getTypeColor = (typeTag) => {
    const colors = {
      WORD: '#60a5fa',
      NAME: '#f59e0b',
      NUMBER: '#10b981',
      DATE: '#8b5cf6',
      URL: '#ec4899',
      PUNCT: '#6b7280',
    }
    return colors[typeTag] || '#60a5fa'
  }

  const getSentimentLabel = (signedSentiment) => {
    const s = signedSentiment || 0
    if (s > 0.15) return 'POS'
    if (s < -0.15) return 'NEG'
    return 'NEU'
  }

  // ==================== View Components ====================

  const TokensView = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <Hash size={16} />
        Token-Level Analysis ({words.length} words)
      </h4>
      
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <div
            key={token.idx}
            onMouseEnter={() => setHoveredToken(token)}
            onMouseLeave={() => setHoveredToken(null)}
            className="relative cursor-pointer token-hover"
          >
            <span
              className="px-2 py-1 rounded text-sm font-medium inline-block"
              style={{
                backgroundColor: token.typeTag === 'PUNCT' 
                  ? 'rgba(107, 114, 128, 0.3)'
                  : getSalienceColor(token.salience),
                color: (token.salience || 0) > 0.5 ? 'white' : '#e5e7eb',
                border: `2px solid ${getTypeColor(token.typeTag)}`,
              }}
            >
              {token.text}
            </span>
          </div>
        ))}
      </div>

      {hoveredToken && (
        <div className="bg-gradient-to-br from-blue-900/60 to-purple-900/60 rounded-lg p-3 border border-blue-500/30 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-400">Word</div>
              <div className="text-white font-bold">{hoveredToken.text}</div>
            </div>
            <div>
              <div className="text-gray-400">Type</div>
              <div className="font-medium" style={{ color: getTypeColor(hoveredToken.typeTag) }}>
                {hoveredToken.typeTag}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Salience</div>
              <div className="text-white font-medium">
                {((hoveredToken.salience || 0) * 100).toFixed(0)}%
                <div className="w-full h-1.5 bg-black/30 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full rounded-full progress-bar"
                    style={{ 
                      width: `${(hoveredToken.salience || 0) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="text-gray-400">Length</div>
              <div className="text-white font-medium">{hoveredToken.len} chars</div>
            </div>
            <div className="col-span-2 mt-1">
              <div className="text-gray-400 mb-1">Visual Impact</div>
              <div className="text-[10px] text-gray-300 space-y-0.5">
                <div>→ Node size ∝ length ({hoveredToken.len})</div>
                <div>→ Glow ∝ salience ({((hoveredToken.salience || 0) * 100).toFixed(0)}%)</div>
                <div>→ Color ∝ type ({hoveredToken.typeTag})</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const SentencesView = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <Layers size={16} />
        Sentence Analysis ({sentences.length} sentences)
      </h4>
      <div className="space-y-2">
        {sentences.map((sent) => {
          const isSelected = selectedSentence === sent.id
          const ringRadius = structure.rings?.[sent.id]?.radius || (1.2 + sent.id * 0.35)
          const ringThickness = structure.rings?.[sent.id]?.thickness || (0.02 + (sent.score || 0) * 0.06)
          
          return (
            <div
              key={sent.id}
              onClick={() => setSelectedSentence(isSelected ? null : sent.id)}
              className="cursor-pointer transition-all analysis-card"
            >
              <div 
                className="p-3 rounded-lg border-l-4"
                style={{
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  borderLeftColor: getSentimentColor(sent.signedSentiment),
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-white text-sm flex-1">{sent.text}</p>
                  <div 
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                    style={{ 
                      backgroundColor: getSentimentColor(sent.signedSentiment),
                      color: 'white'
                    }}
                  >
                    {getSentimentLabel(sent.signedSentiment)}
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-gray-400">Sentiment</div>
                      <div className="text-white font-bold">{(sent.signedSentiment || 0).toFixed(2)}</div>
                      <div className="w-full h-1.5 bg-black/30 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${Math.abs(sent.signedSentiment || 0) * 100}%`,
                            backgroundColor: getSentimentColor(sent.signedSentiment)
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Words</div>
                      <div className="text-white font-bold">{sent.wordCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Ring Radius</div>
                      <div className="text-white font-bold">{ringRadius.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Thickness</div>
                      <div className="text-white font-bold">{ringThickness.toFixed(3)}</div>
                    </div>
                    <div className="col-span-2 mt-1">
                      <div className="text-gray-400 mb-1">Visual Mapping</div>
                      <div className="text-[10px] text-gray-300 space-y-0.5">
                        <div>→ Ring #{sent.id + 1}: r={ringRadius.toFixed(2)}</div>
                        <div>→ Thickness ∝ emotion ({(sent.score || 0).toFixed(2)})</div>
                        <div>→ Position ∝ sentence index</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const MappingView = () => (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-white flex items-center gap-2">
        <TrendingUp size={16} />
        Stats → Structure Transformation
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Stats */}
        <div>
          <div className="text-xs font-bold text-blue-400 uppercase mb-2">Input Stats</div>
          <div className="space-y-2">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} className="bg-white/5 rounded p-2 analysis-card">
                <div className="text-[10px] text-gray-400">{key}</div>
                <div className="text-white text-sm font-bold">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output Structure */}
        <div>
          <div className="text-xs font-bold text-purple-400 uppercase mb-2">Output Params</div>
          <div className="space-y-2">
            {Object.entries(structure).slice(0, 4).map(([key, value]) => (
              <div key={key} className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded p-2 border border-blue-500/20 analysis-card">
                <div className="text-[10px] text-gray-400">{key}</div>
                <div className="text-white text-sm font-bold">
                  {typeof value === 'number' ? value.toFixed(2) : value}
                </div>
                <div className="text-[9px] text-gray-300 mt-1">
                  {metadata.mappingNotes?.[key]?.split('∝')[1] || ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const FlowView = () => {
    const steps = [
      { 
        step: 1, 
        color: '#3b82f6',
        title: 'Text Input', 
        desc: 'Tokenization & sentence splitting',
        data: `${stats.wordCount} words, ${stats.sentenceCount} sentences`
      },
      { 
        step: 2, 
        color: '#a855f7',
        title: 'AI Analysis', 
        desc: 'Embeddings + sentiment per token/sentence',
        data: `${embedding.length}D vector, sentiment scores`
      },
      { 
        step: 3, 
        color: '#ec4899',
        title: 'Statistics', 
        desc: 'TTR, variance, emphasis, questions',
        data: `TTR=${(stats.lexicalDiversity || 0).toFixed(2)}, Q=${(stats.questionScore || 0).toFixed(2)}`
      },
      { 
        step: 4, 
        color: '#22c55e',
        title: 'Mapping', 
        desc: 'Transform stats → visual parameters',
        data: `${structure.branches}br, ${structure.complexity}cx, ${(structure.angle || 0).toFixed(1)}°`
      },
      { 
        step: 5, 
        color: '#eab308',
        title: '3D Render', 
        desc: 'Generate geometry in Three.js',
        data: `${structure.rings?.length || 0} rings, ${structure.nodes?.length || 0} nodes`
      }
    ]

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Circle size={16} />
          Processing Pipeline
        </h4>
        <div className="space-y-3">
          {steps.map(({ step, color, title, desc, data }, i, arr) => (
            <div key={step} className="relative">
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {step}
                </div>
                <div 
                  className="flex-1 rounded-lg p-2 border"
                  style={{ 
                    backgroundColor: `${color}10`,
                    borderColor: `${color}30`
                  }}
                >
                  <div className="font-bold text-white text-sm">{title}</div>
                  <div className="text-xs text-gray-300">{desc}</div>
                  <div className="text-[10px] text-gray-400 mt-1">→ {data}</div>
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className="ml-4 h-4 w-0.5 bg-gradient-to-b from-gray-400 to-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ==================== Main Render ====================

  return (
    <div className="w-full space-y-4 analysis-panel-container">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-cyan-400" size={24} />
            <div>
              <h3 className="text-lg font-bold text-white">Analysis Pipeline</h3>
              <p className="text-xs text-gray-400">Real-time breakdown of your text</p>
            </div>
          </div>
          {onToggle && (
            <button 
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle analysis panel"
            >
              {isVisible ? 
                <EyeOff size={20} className="text-gray-300" /> : 
                <Eye size={20} className="text-gray-300" />
              }
            </button>
          )}
        </div>
      </div>

      {isVisible && (
        <>
          {/* View Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 nice-scroll">
            {[
              { id: 'tokens', label: 'Tokens', icon: Hash },
              { id: 'sentences', label: 'Sentences', icon: Layers },
              { id: 'mapping', label: 'Mapping', icon: TrendingUp },
              { id: 'flow', label: 'Flow', icon: Circle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeView === id
                    ? 'bg-blue-500 text-white glow-blue'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="bg-black/40 rounded-xl p-4 border border-white/10 max-h-[600px] overflow-y-auto nice-scroll">
            {activeView === 'tokens' && <TokensView />}
            {activeView === 'sentences' && <SentencesView />}
            {activeView === 'mapping' && <MappingView />}
            {activeView === 'flow' && <FlowView />}
          </div>

          {/* Legend */}
          <div className="bg-black/40 rounded-xl p-3 border border-white/10">
            <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Legend</div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getTypeColor('WORD') }} />
                <span className="text-gray-300">Word</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getTypeColor('NAME') }} />
                <span className="text-gray-300">Name</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-300">Positive</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}