// src/components/RealtimeAnalysisPanel.jsx
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * Minimalistisches, präzises Analysis Panel
 * Dunkles Design, technische Details, keine flashy Effekte
 */
export default function RealtimeAnalysisPanel({ 
  bloomData, 
  analysisResult,
  isVisible = true,
  onToggle 
}) {
  const [activeView, setActiveView] = useState('overview')
  const [expandedSections, setExpandedSections] = useState({
    tokens: false,
    sentences: false,
    statistics: true,
    mapping: true,
    technical: false,
    embedding: false,
    bloomDetails: false,
    emotionHints: false
  })

  if (!analysisResult || !bloomData) {
    return (
      <div className="bg-[#0a0a0a] rounded border border-white/5 p-8 text-center">
        <div className="text-gray-500 text-sm">No analysis data available</div>
        <div className="text-gray-600 text-xs mt-2">Enter text to begin analysis</div>
      </div>
    )
  }

  const { tokens = [], sentences = [], stats = {}, embedding = [], hints = {} } = analysisResult
  const { structure = {}, metadata = {}, energy = {} } = bloomData

  const words = tokens.filter(t => t.typeTag !== 'PUNCT')

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Minimalist colors - grayscale only
  const getSalienceGray = (salience) => {
    const s = Math.max(0, Math.min(1, salience || 0))
    const brightness = Math.floor(100 + s * 155) // 100-255 range
    return `rgb(${brightness}, ${brightness}, ${brightness})`
  }

  const getSentimentIndicator = (signed) => {
    const s = signed || 0
    if (s > 0.15) return '+'
    if (s < -0.15) return '-'
    return '~'
  }

  // ==================== Section Components ====================

  const OverviewSection = () => (
    <div className="space-y-6">
      {/* Core Statistics */}
      <Section title="Core Statistics" expanded={expandedSections.statistics} onToggle={() => toggleSection('statistics')}>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <Metric label="Total Words" value={stats.wordCount} />
          <Metric label="Unique Words" value={stats.uniqueWords} />
          <Metric label="Sentences" value={stats.sentenceCount} />
          
          <Metric label="Avg Word Length" value={stats.avgWordLength?.toFixed(2)} />
          <Metric label="Lexical Diversity (TTR)" value={stats.lexicalDiversity?.toFixed(4)} />
          <Metric label="Mean Sentence Length" value={stats.meanSentenceLength?.toFixed(2)} />
          
          <Metric label="Sentence Length Variance" value={stats.varianceSentenceLength?.toFixed(4)} />
          <Metric label="Sentence Length StdDev" value={stats.stdSentenceLength?.toFixed(4)} />
          <Metric label="Punctuation Density" value={stats.punctuationPerWord?.toFixed(4)} />
          
          <Metric label="Emphasis Score" value={stats.emphasisScore?.toFixed(4)} />
          <Metric label="Question Score" value={stats.questionScore?.toFixed(4)} />
          <Metric label="Embedding Dimensions" value={embedding.length} />
        </div>
      </Section>

      {/* Structure Mapping */}
      <Section title="Structure Mapping" expanded={expandedSections.mapping} onToggle={() => toggleSection('mapping')}>
        <div className="space-y-3">
          <MappingRow 
            param="branches" 
            value={structure.branches}
            formula="⌊log₂(sentences + 1) × 4 + min(3, √variance_sent_len)⌋"
            inputs={`sentences=${stats.sentenceCount}, variance=${stats.varianceSentenceLength?.toFixed(2)}`}
          />
          <MappingRow 
            param="complexity" 
            value={structure.complexity}
            formula="⌊(wordCount / 25) + min(3, √variance_sent_len)⌋"
            inputs={`words=${stats.wordCount}, variance=${stats.varianceSentenceLength?.toFixed(2)}`}
          />
          <MappingRow 
            param="symmetry" 
            value={structure.symmetry?.toFixed(4)}
            formula="clamp(TTR, 0.4, 0.95)"
            inputs={`TTR=${stats.lexicalDiversity?.toFixed(4)}`}
          />
          <MappingRow 
            param="angle" 
            value={`${structure.angle?.toFixed(2)}°`}
            formula="20 + ((embedding[0] + 1) × 25) + (topicHash % 15) × 0.3"
            inputs={`emb[0]=${embedding[0]?.toFixed(4)}, hash=${hints.topicHash}`}
          />
          <MappingRow 
            param="color (base)" 
            value={structure.color}
            formula="sentiment → HSL mapping"
            inputs={`sentiment=${metadata.sentiment}, score=${metadata.confidence?.toFixed(2)}`}
          />
        </div>
      </Section>

      {/* Energy Parameters */}
      <Section title="Energy Parameters" expanded={expandedSections.technical} onToggle={() => toggleSection('technical')}>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <Metric label="Particle Count" value={energy.count} />
          <Metric label="Speed Factor" value={energy.speed?.toFixed(4)} />
          <Metric label="Direction" value={energy.direction === 1 ? 'Upward (+1)' : energy.direction === -1 ? 'Downward (-1)' : 'Floating (0)'} />
          <Metric label="Token Particles" value={energy.tokens?.length || 0} />
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <div>Speed = max(|sentiment_score|, emphasis_score)</div>
          <div>Direction = sign(sentiment): POSITIVE → +1, NEGATIVE → -1, NEUTRAL → 0</div>
          <div>Count = clamp(wordCount × 2, 50, 400)</div>
        </div>
      </Section>
    </div>
  )

  const TokensSection = () => (
    <Section title={`Token Analysis (${words.length} tokens)`} expanded={expandedSections.tokens} onToggle={() => toggleSection('tokens')}>
      <div className="space-y-2">
        <div className="grid grid-cols-8 gap-2 text-[10px] text-gray-500 font-mono pb-2 border-b border-white/5">
          <div>IDX</div>
          <div className="col-span-2">TEXT</div>
          <div>TYPE</div>
          <div>LEN</div>
          <div>SALIENCE</div>
          <div>SENT</div>
          <div>NODE SIZE</div>
        </div>
        <div className="space-y-1 max-h-96 overflow-y-auto nice-scroll">
          {tokens.slice(0, 100).map((token) => (
            <div key={token.idx} className="grid grid-cols-8 gap-2 text-xs font-mono hover:bg-white/5 px-2 py-1 rounded transition-colors">
              <div className="text-gray-500">{token.idx}</div>
              <div className="col-span-2 truncate" style={{ color: getSalienceGray(token.salience) }}>
                {token.text}
              </div>
              <div className="text-gray-600 text-[10px]">{token.typeTag}</div>
              <div className="text-gray-500">{token.len}</div>
              <div className="text-gray-400">{(token.salience || 0).toFixed(3)}</div>
              <div className="text-gray-500">{token.sentenceId}</div>
              <div className="text-gray-400">{(0.04 + (token.len || 1) * 0.01).toFixed(3)}</div>
            </div>
          ))}
        </div>
        {tokens.length > 100 && (
          <div className="text-xs text-gray-600 text-center pt-2">
            Showing first 100 of {tokens.length} tokens
          </div>
        )}
      </div>
    </Section>
  )

  const SentencesSection = () => (
    <Section title={`Sentence Analysis (${sentences.length} sentences)`} expanded={expandedSections.sentences} onToggle={() => toggleSection('sentences')}>
      <div className="space-y-3">
        {sentences.map((sent) => {
          const ring = structure.rings?.[sent.id]
          const ringRadius = ring?.radius || (1.2 + sent.id * 0.35)
          const ringThickness = ring?.thickness || (0.02 + (sent.score || 0) * 0.06)
          const ringTilt = ring?.tilt || 0
          
          return (
            <div key={sent.id} className="bg-white/[0.02] border border-white/5 rounded p-3 hover:bg-white/[0.04] transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-xs text-gray-600 font-mono shrink-0">S{sent.id}</div>
                <div className="flex-1">
                  <div className="text-sm text-gray-300 mb-2">{sent.text}</div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <Metric label="Words" value={sent.wordCount} inline />
                    <Metric label="Sentiment" value={`${getSentimentIndicator(sent.signedSentiment)} ${(sent.signedSentiment || 0).toFixed(3)}`} inline />
                    <Metric label="Score" value={(sent.score || 0).toFixed(3)} inline />
                    <Metric label="Ring Radius" value={ringRadius.toFixed(3)} inline />
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-3 gap-3 text-xs">
                    <Metric label="Thickness" value={ringThickness.toFixed(4)} inline />
                    <Metric label="Tilt (rad)" value={ringTilt.toFixed(4)} inline />
                    <Metric label="Color" value={ring?.color || structure.color} inline />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )

  const TechnicalSection = () => (
    <div className="space-y-6">
      <Section title="Embedding Vector" expanded={expandedSections.embedding} onToggle={() => toggleSection('embedding')}>
        <div className="text-xs font-mono text-gray-500 space-y-1">
          <div>Dimensions: {embedding.length}</div>
          <div className="grid grid-cols-8 gap-2 mt-2">
            {embedding.slice(0, 16).map((val, i) => (
              <div key={i} className="text-gray-600">
                <span className="text-gray-700">[{i}]</span> {val.toFixed(4)}
              </div>
            ))}
          </div>
          {embedding.length > 16 && (
            <div className="text-gray-700 pt-2">... and {embedding.length - 16} more dimensions</div>
          )}
        </div>
      </Section>

      <Section title="Bloom Structure Details" expanded={expandedSections.bloomDetails} onToggle={() => toggleSection('bloomDetails')}>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <Metric label="Total Rings" value={structure.rings?.length || 0} />
          <Metric label="Total Nodes" value={structure.nodes?.length || 0} />
          <Metric label="Total Links" value={structure.links?.length || 0} />
          <Metric label="Highlights" value={structure.highlights?.length || 0} />
          <Metric label="Topic Hash" value={hints.topicHash} />
          <Metric label="Mean Ring Radius" value={structure.rings ? (structure.rings.reduce((sum, r) => sum + r.radius, 0) / structure.rings.length).toFixed(3) : '—'} />
        </div>
      </Section>

      <Section title="Emotion Hints" expanded={expandedSections.emotionHints} onToggle={() => toggleSection('emotionHints')}>
        <div className="grid grid-cols-4 gap-4 text-xs">
          {Object.entries(hints.emotionHints || {}).map(([key, value]) => (
            <Metric key={key} label={key} value={value} />
          ))}
        </div>
      </Section>
    </div>
  )

  // ==================== Main Render ====================

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-200">Analysis Pipeline</h2>
            <p className="text-xs text-gray-600 mt-1">Detailed breakdown of text processing and structure generation</p>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tokens', label: 'Tokens' },
          { id: 'sentences', label: 'Sentences' },
          { id: 'technical', label: 'Technical' }
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            className={`px-4 py-2 text-sm font-medium rounded transition-all ${
              activeView === id
                ? 'bg-white/10 text-white border border-white/10'
                : 'bg-white/[0.02] text-gray-500 border border-white/5 hover:bg-white/5 hover:text-gray-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded p-6">
        {activeView === 'overview' && <OverviewSection />}
        {activeView === 'tokens' && <TokensSection />}
        {activeView === 'sentences' && <SentencesSection />}
        {activeView === 'technical' && <TechnicalSection />}
      </div>

      {/* Footer Info */}
      <div className="text-xs text-gray-600 text-center">
        All calculations are deterministic and reproducible based on the input text
      </div>
    </div>
  )
}

// ==================== Helper Components ====================

function Section({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-white/5 rounded">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
      >
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
        {expanded ? <ChevronDown size={16} className="text-gray-600" /> : <ChevronRight size={16} className="text-gray-600" />}
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, inline = false }) {
  if (inline) {
    return (
      <div>
        <div className="text-gray-600 text-[10px]">{label}</div>
        <div className="text-gray-400 font-mono">{value ?? '—'}</div>
      </div>
    )
  }
  
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded p-2">
      <div className="text-gray-600 text-[10px] mb-1">{label}</div>
      <div className="text-gray-300 font-mono text-sm">{value ?? '—'}</div>
    </div>
  )
}

function MappingRow({ param, value, formula, inputs }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono text-sm text-gray-300">{param}</div>
        <div className="font-mono text-sm text-gray-400">{value}</div>
      </div>
      <div className="text-xs text-gray-600 font-mono mb-1">{formula}</div>
      <div className="text-[10px] text-gray-700">{inputs}</div>
    </div>
  )
}