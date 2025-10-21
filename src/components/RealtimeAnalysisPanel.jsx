// src/components/RealtimeAnalysisPanel.jsx
import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * Advanced Technical Analysis Panel
 * Maximale Transparenz mit allen Berechnungsdetails
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
    emotionHints: false,
    distributions: false,
    advanced: false,
    geometry: false,
    colors: false
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

  // ==================== Advanced Statistics ====================
  
  const advancedStats = useMemo(() => {
    // Token Type Distribution
    const typeDistribution = {}
    tokens.forEach(t => {
      typeDistribution[t.typeTag] = (typeDistribution[t.typeTag] || 0) + 1
    })

    // Salience Statistics
    const saliences = words.map(w => w.salience || 0).filter(s => s > 0)
    saliences.sort((a, b) => a - b)
    const meanSalience = saliences.length ? saliences.reduce((a, b) => a + b, 0) / saliences.length : 0
    const medianSalience = saliences.length ? saliences[Math.floor(saliences.length / 2)] : 0
    const minSalience = saliences.length ? Math.min(...saliences) : 0
    const maxSalience = saliences.length ? Math.max(...saliences) : 0
    const q1Salience = saliences.length ? saliences[Math.floor(saliences.length * 0.25)] : 0
    const q3Salience = saliences.length ? saliences[Math.floor(saliences.length * 0.75)] : 0

    // Sentence Length Distribution
    const sentLengths = sentences.map(s => s.wordCount)
    const meanSentLen = sentLengths.length ? sentLengths.reduce((a, b) => a + b, 0) / sentLengths.length : 0
    const medianSentLen = sentLengths.length ? [...sentLengths].sort((a, b) => a - b)[Math.floor(sentLengths.length / 2)] : 0
    const minSentLen = sentLengths.length ? Math.min(...sentLengths) : 0
    const maxSentLen = sentLengths.length ? Math.max(...sentLengths) : 0

    // Word Length Distribution
    const wordLengths = words.map(w => w.len)
    const meanWordLen = wordLengths.length ? wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length : 0
    const medianWordLen = wordLengths.length ? [...wordLengths].sort((a, b) => a - b)[Math.floor(wordLengths.length / 2)] : 0

    // Sentiment Distribution
    const sentiments = sentences.map(s => s.signedSentiment || 0)
    const meanSentiment = sentiments.length ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0
    const sentimentVariance = sentiments.length 
      ? sentiments.reduce((sum, val) => sum + Math.pow(val - meanSentiment, 2), 0) / sentiments.length 
      : 0
    const sentimentStdDev = Math.sqrt(sentimentVariance)

    return {
      typeDistribution,
      salience: { mean: meanSalience, median: medianSalience, min: minSalience, max: maxSalience, q1: q1Salience, q3: q3Salience },
      sentenceLength: { mean: meanSentLen, median: medianSentLen, min: minSentLen, max: maxSentLen },
      wordLength: { mean: meanWordLen, median: medianWordLen },
      sentiment: { mean: meanSentiment, variance: sentimentVariance, stdDev: sentimentStdDev }
    }
  }, [tokens, words, sentences])

  // Ring Geometry Details
  const ringGeometry = useMemo(() => {
    if (!structure.rings) return null
    
    const radii = structure.rings.map(r => r.radius)
    const thicknesses = structure.rings.map(r => r.thickness)
    const tilts = structure.rings.map(r => r.tilt)
    const opacities = structure.rings.map(r => r.opacity)

    return {
      count: structure.rings.length,
      radiusMin: Math.min(...radii),
      radiusMax: Math.max(...radii),
      radiusMean: radii.reduce((a, b) => a + b, 0) / radii.length,
      thicknessMin: Math.min(...thicknesses),
      thicknessMax: Math.max(...thicknesses),
      thicknessMean: thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length,
      tiltMin: Math.min(...tilts),
      tiltMax: Math.max(...tilts),
      tiltMean: tilts.reduce((a, b) => a + b, 0) / tilts.length,
      opacityMin: Math.min(...opacities),
      opacityMax: Math.max(...opacities),
      opacityMean: opacities.reduce((a, b) => a + b, 0) / opacities.length,
    }
  }, [structure.rings])

  // Node Statistics
  const nodeStats = useMemo(() => {
    if (!structure.nodes) return null

    const sizes = structure.nodes.map(n => n.size)
    const saliences = structure.nodes.map(n => n.salience || 0)

    return {
      count: structure.nodes.length,
      sizeMin: Math.min(...sizes),
      sizeMax: Math.max(...sizes),
      sizeMean: sizes.reduce((a, b) => a + b, 0) / sizes.length,
      salienceMin: Math.min(...saliences),
      salienceMax: Math.max(...saliences),
      salienceMean: saliences.reduce((a, b) => a + b, 0) / saliences.length,
    }
  }, [structure.nodes])

  // Color Analysis
  const colorAnalysis = useMemo(() => {
    const colors = []
    if (structure.rings) colors.push(...structure.rings.map(r => r.color))
    if (structure.nodes) colors.push(...structure.nodes.map(n => n.color))
    if (structure.highlights) colors.push(...structure.highlights.map(h => h.color))

    const uniqueColors = [...new Set(colors)]

    return {
      total: colors.length,
      unique: uniqueColors.length,
      palette: uniqueColors.slice(0, 10)
    }
  }, [structure])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const getSalienceGray = (salience) => {
    const s = Math.max(0, Math.min(1, salience || 0))
    const brightness = Math.floor(100 + s * 155)
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

      {/* Distributions */}
      <Section title="Statistical Distributions" expanded={expandedSections.distributions} onToggle={() => toggleSection('distributions')}>
        <div className="space-y-4">
          {/* Token Type Distribution */}
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium">Token Type Distribution</div>
            <div className="grid grid-cols-6 gap-2 text-xs">
              {Object.entries(advancedStats.typeDistribution).map(([type, count]) => (
                <Metric key={type} label={type} value={`${count} (${((count / tokens.length) * 100).toFixed(1)}%)`} inline />
              ))}
            </div>
          </div>

          {/* Salience Statistics */}
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium">Salience Distribution (Word Importance)</div>
            <div className="grid grid-cols-6 gap-2 text-xs">
              <Metric label="Mean" value={advancedStats.salience.mean.toFixed(4)} inline />
              <Metric label="Median" value={advancedStats.salience.median.toFixed(4)} inline />
              <Metric label="Min" value={advancedStats.salience.min.toFixed(4)} inline />
              <Metric label="Max" value={advancedStats.salience.max.toFixed(4)} inline />
              <Metric label="Q1 (25%)" value={advancedStats.salience.q1.toFixed(4)} inline />
              <Metric label="Q3 (75%)" value={advancedStats.salience.q3.toFixed(4)} inline />
            </div>
          </div>

          {/* Sentence Length Distribution */}
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium">Sentence Length Distribution</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <Metric label="Mean" value={advancedStats.sentenceLength.mean.toFixed(2)} inline />
              <Metric label="Median" value={advancedStats.sentenceLength.median} inline />
              <Metric label="Min" value={advancedStats.sentenceLength.min} inline />
              <Metric label="Max" value={advancedStats.sentenceLength.max} inline />
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div>
            <div className="text-xs text-gray-500 mb-2 font-medium">Sentiment Distribution</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Metric label="Mean" value={advancedStats.sentiment.mean.toFixed(4)} inline />
              <Metric label="Variance" value={advancedStats.sentiment.variance.toFixed(6)} inline />
              <Metric label="Std Deviation" value={advancedStats.sentiment.stdDev.toFixed(4)} inline />
            </div>
          </div>
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
            calculation={`⌊log₂(${stats.sentenceCount} + 1) × 4 + min(3, √${stats.varianceSentenceLength?.toFixed(2)})⌋ = ${structure.branches}`}
          />
          <MappingRow 
            param="complexity" 
            value={structure.complexity}
            formula="⌊(wordCount / 25) + min(3, √variance_sent_len)⌋"
            inputs={`words=${stats.wordCount}, variance=${stats.varianceSentenceLength?.toFixed(2)}`}
            calculation={`⌊(${stats.wordCount} / 25) + min(3, √${stats.varianceSentenceLength?.toFixed(2)})⌋ = ${structure.complexity}`}
          />
          <MappingRow 
            param="symmetry" 
            value={structure.symmetry?.toFixed(4)}
            formula="clamp(TTR, 0.4, 0.95)"
            inputs={`TTR=${stats.lexicalDiversity?.toFixed(4)}`}
            calculation={`clamp(${stats.lexicalDiversity?.toFixed(4)}, 0.4, 0.95) = ${structure.symmetry?.toFixed(4)}`}
          />
          <MappingRow 
            param="angle" 
            value={`${structure.angle?.toFixed(2)}°`}
            formula="20 + ((embedding[0] + 1) × 25) + (topicHash % 15) × 0.3"
            inputs={`emb[0]=${embedding[0]?.toFixed(4)}, hash=${hints.topicHash}`}
            calculation={`20 + ((${embedding[0]?.toFixed(4)} + 1) × 25) + (${hints.topicHash} % 15) × 0.3 = ${structure.angle?.toFixed(2)}°`}
          />
          <MappingRow 
            param="color (base)" 
            value={structure.color}
            formula="sentiment → HSL mapping"
            inputs={`sentiment=${metadata.sentiment}, score=${metadata.confidence?.toFixed(2)}`}
            calculation={`HSL from sentiment analysis`}
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
        <div className="mt-3 text-xs text-gray-500 space-y-1 bg-black/20 border border-white/5 rounded p-3">
          <div>Speed = max(|sentiment_score|, emphasis_score)</div>
          <div className="font-mono text-gray-600">
            = max(|{metadata.confidence?.toFixed(4)}|, {stats.emphasisScore?.toFixed(4)}) = {energy.speed?.toFixed(4)}
          </div>
          <div className="mt-2">Direction = sign(sentiment): POSITIVE → +1, NEGATIVE → -1, NEUTRAL → 0</div>
          <div className="font-mono text-gray-600">
            = {metadata.sentiment} → {energy.direction}
          </div>
          <div className="mt-2">Count = clamp(wordCount × 2, 50, 400)</div>
          <div className="font-mono text-gray-600">
            = clamp({stats.wordCount} × 2, 50, 400) = {energy.count}
          </div>
        </div>
      </Section>

      {/* Geometry Details */}
      {ringGeometry && (
        <Section title="Ring Geometry Statistics" expanded={expandedSections.geometry} onToggle={() => toggleSection('geometry')}>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <Metric label="Total Rings" value={ringGeometry.count} />
            <Metric label="Radius Range" value={`${ringGeometry.radiusMin.toFixed(2)} - ${ringGeometry.radiusMax.toFixed(2)}`} />
            <Metric label="Mean Radius" value={ringGeometry.radiusMean.toFixed(3)} />
            
            <Metric label="Thickness Range" value={`${ringGeometry.thicknessMin.toFixed(4)} - ${ringGeometry.thicknessMax.toFixed(4)}`} />
            <Metric label="Mean Thickness" value={ringGeometry.thicknessMean.toFixed(4)} />
            <Metric label="Thickness Spread" value={(ringGeometry.thicknessMax - ringGeometry.thicknessMin).toFixed(4)} />
            
            <Metric label="Tilt Range (rad)" value={`${ringGeometry.tiltMin.toFixed(4)} - ${ringGeometry.tiltMax.toFixed(4)}`} />
            <Metric label="Mean Tilt" value={ringGeometry.tiltMean.toFixed(4)} />
            <Metric label="Tilt Spread" value={(ringGeometry.tiltMax - ringGeometry.tiltMin).toFixed(4)} />
            
            <Metric label="Opacity Range" value={`${ringGeometry.opacityMin.toFixed(2)} - ${ringGeometry.opacityMax.toFixed(2)}`} />
            <Metric label="Mean Opacity" value={ringGeometry.opacityMean.toFixed(3)} />
            <Metric label="Opacity Spread" value={(ringGeometry.opacityMax - ringGeometry.opacityMin).toFixed(3)} />
          </div>
        </Section>
      )}

      {/* Node Statistics */}
      {nodeStats && (
        <Section title="Node Statistics" expanded={expandedSections.advanced} onToggle={() => toggleSection('advanced')}>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <Metric label="Total Nodes" value={nodeStats.count} />
            <Metric label="Size Range" value={`${nodeStats.sizeMin.toFixed(4)} - ${nodeStats.sizeMax.toFixed(4)}`} />
            <Metric label="Mean Size" value={nodeStats.sizeMean.toFixed(4)} />
            
            <Metric label="Salience Range" value={`${nodeStats.salienceMin.toFixed(4)} - ${nodeStats.salienceMax.toFixed(4)}`} />
            <Metric label="Mean Salience" value={nodeStats.salienceMean.toFixed(4)} />
            <Metric label="Total Links" value={structure.links?.length || 0} />
          </div>
        </Section>
      )}

      {/* Color Analysis */}
      <Section title="Color Palette Analysis" expanded={expandedSections.colors} onToggle={() => toggleSection('colors')}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <Metric label="Total Colors Used" value={colorAnalysis.total} />
            <Metric label="Unique Colors" value={colorAnalysis.unique} />
            <Metric label="Base Color" value={structure.color} />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-2">Palette (first 10 unique colors)</div>
            <div className="flex flex-wrap gap-2">
              {colorAnalysis.palette.map((color, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded px-2 py-1">
                  <div 
                    className="w-4 h-4 rounded border border-white/10" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-mono text-gray-500">{color}</span>
                </div>
              ))}
            </div>
          </div>
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
        <div className="space-y-1 max-h-96 overflow-y-auto minimal-scroll">
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
        <div className="text-xs font-mono text-gray-500 space-y-2">
          <div className="text-gray-400">Dimensions: {embedding.length}</div>
          <div className="max-h-96 overflow-y-auto minimal-scroll bg-black/20 border border-white/5 rounded p-3">
            <div className="grid grid-cols-8 gap-2">
              {embedding.map((val, i) => (
                <div key={i} className="text-gray-600 hover:text-gray-400 transition-colors">
                  <span className="text-gray-700">[{i}]</span> {val.toFixed(4)}
                </div>
              ))}
            </div>
          </div>
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
            <h2 className="text-lg font-medium text-gray-200">Advanced Analysis Pipeline</h2>
            <p className="text-xs text-gray-600 mt-1">Complete technical breakdown with all calculations and distributions</p>
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
      <div className="text-xs text-gray-600 text-center space-y-1">
        <div>All calculations are deterministic and reproducible based on the input text</div>
        <div className="font-mono text-gray-700">
          Analysis completed • {tokens.length} tokens • {sentences.length} sentences • {embedding.length}D embedding
        </div>
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

function MappingRow({ param, value, formula, inputs, calculation }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono text-sm text-gray-300">{param}</div>
        <div className="font-mono text-sm text-gray-400">{value}</div>
      </div>
      <div className="text-xs text-gray-600 font-mono mb-1">{formula}</div>
      <div className="text-[10px] text-gray-700 mb-1">{inputs}</div>
      {calculation && (
        <div className="text-[10px] text-gray-600 font-mono bg-black/20 rounded px-2 py-1 mt-2">
          {calculation}
        </div>
      )}
    </div>
  )
}