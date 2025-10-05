import { useState, useEffect } from 'react'
import { Info, X, Code, Zap, Palette, GitBranch, Target, Brain } from 'lucide-react'

export default function TechnicalInfoPanel({ bloomData }) {
  const [isOpen, setIsOpen] = useState(false)
  const meta = bloomData?.metadata
  const struct = bloomData?.structure
  const hasData = !!bloomData

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      {/* Trigger Button - Standalone, neutral styling, same width as other containers */}
      <div className="flex flex-col gap-2 max-w-md">
        <button
          onClick={() => hasData && setIsOpen(true)}
          disabled={!hasData}
          className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium
                     transition-all duration-200 group
                     ${hasData 
                       ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-gray-300 hover:text-white cursor-pointer' 
                       : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-50'
                     }`}
          title={hasData ? "View technical details about the calculation" : "Analyze text first to view technical details"}
        >
          <Info size={16} className={hasData ? "group-hover:scale-110 transition-transform" : ""} />
          <span>How is this calculated?</span>
        </button>
        
        {!hasData && (
          <p className="text-xs text-gray-500 italic">
            Enter text above and wait for analysis to view technical details
          </p>
        )}
      </div>

      {/* Technical Details Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6
                        pointer-events-auto overflow-y-auto nice-scroll
                        bg-black/75 backdrop-blur-sm
                        animate-in fade-in duration-200"
             onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="bg-[#0a0e1a]/98 backdrop-blur-xl border border-white/10 rounded-xl 
                          shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col
                          animate-in zoom-in-95 duration-300"
               onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Technical Documentation</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Understanding the Hash Structure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 
                           hover:text-white"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 text-sm overflow-y-auto nice-scroll flex-1">
              
              {/* Overview Section */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  Overview
                </h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <p className="text-gray-300 leading-relaxed">
                    The Hash visualization is a multi-dimensional representation of text analysis 
                    combining <strong>NLP embeddings</strong>, <strong>sentiment analysis</strong>, and 
                    <strong>statistical text features</strong>. Each visual element is derived from 
                    explainable metrics and deterministic algorithms.
                  </p>
                </div>
              </section>

              {/* Structure Parameters */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  Global Structure Parameters
                </h3>
                <div className="space-y-3">
                  
                  <DetailCard
                    icon={<GitBranch size={16} />}
                    title="Branches"
                    value={struct?.branches}
                    formula="⌊log₂(1 + #sentences) × 4 + min(3, √variance(sentence_lengths))⌋"
                    explanation="Represents text segmentation. More sentences and varied sentence lengths create more complex branching structures. Clamped between 3-16 branches."
                    color="emerald"
                  />

                  <DetailCard
                    icon={<Target size={16} />}
                    title="Complexity"
                    value={struct?.complexity}
                    formula="⌊word_count / 25 + min(3, √variance(sentence_lengths))⌋"
                    explanation="Measures textual density. Longer texts with varied sentence structures increase complexity. Scales with overall word count. Range: 2-7 levels."
                    color="purple"
                  />

                  <DetailCard
                    icon={<Palette size={16} />}
                    title="Symmetry"
                    value={struct?.symmetry?.toFixed(3)}
                    formula="TTR = unique_words / total_words"
                    explanation="Type-Token Ratio (TTR) measures lexical diversity. Higher values indicate richer vocabulary and more varied word usage. Range: 0.4-0.95."
                    color="blue"
                  />

                  <DetailCard
                    icon={<Zap size={16} />}
                    title="Angle"
                    value={`${struct?.angle?.toFixed(1)}°`}
                    formula="20 + (embedding[0] + 1) × 25 + (topic_hash mod 15) × 0.3"
                    explanation="Derived from the first dimension of the document embedding vector plus a deterministic topic hash. Controls branch spread angle. Range: 15-75 degrees."
                    color="amber"
                  />

                </div>
              </section>

              {/* Color System */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  Multi-Color System (HSL)
                </h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ColorExplanation
                      label="Hue"
                      range="0-360°"
                      meaning="Represents topic/theme. Calculated from document embedding projection: 
                              (emb[0]×120 + emb[1]×180 + emb[2]×240) × 0.5"
                      example="Different themes → Different colors"
                    />
                    <ColorExplanation
                      label="Saturation"
                      range="25-100%"
                      meaning="Token importance (salience). Higher salience = more saturated. 
                              Formula: 40 + salience × 55"
                      example="Important words → Vivid colors"
                    />
                    <ColorExplanation
                      label="Lightness"
                      range="35-80%"
                      meaning="Sentiment valence. Positive = brighter, negative = darker. 
                              Formula: 55 + sign(sentiment) × (12 × |sentiment|)"
                      example="Positive text → Brighter colors"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <strong>Type-based hue bias:</strong> NAME tokens (+15°), NUMBER (+8°), 
                    DATE (+12°), URL (+20°) for visual differentiation
                  </div>
                </div>
              </section>

              {/* Sentence Rings */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Sentence Rings (Torus Geometry)
                </h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="space-y-2 text-gray-300">
                    <FormulaRow
                      label="Radius"
                      formula="1.2 + sentence_index × 0.35 + word_count × 0.005"
                      description="Increases with sentence position and length"
                    />
                    <FormulaRow
                      label="Thickness"
                      formula="0.02 + clamp(|sentiment_score|, 0, 1) × 0.06"
                      description="Emotional intensity increases ring thickness"
                    />
                    <FormulaRow
                      label="Tilt"
                      formula="((topic_hash mod 23) × 0.03 + index × 0.07) mod (π/2)"
                      description="Deterministic variation based on content hash"
                    />
                    <FormulaRow
                      label="Opacity"
                      formula="0.25 - min(0.18, index × 0.03)"
                      description="Later sentences are more transparent"
                    />
                  </div>
                </div>
              </section>

              {/* Token Nodes */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Word Nodes (Instanced Spheres)
                </h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="space-y-2 text-gray-300">
                    <FormulaRow
                      label="Position (θ)"
                      formula="(2π × word_index_in_sentence) / sentence_word_count"
                      description="Words are evenly distributed around the sentence ring"
                    />
                    <FormulaRow
                      label="Size"
                      formula="0.04 + word_length × 0.01"
                      description="Longer words create larger nodes"
                    />
                    <FormulaRow
                      label="Salience"
                      formula="cosine_similarity(word_embedding, document_embedding)"
                      description="Normalized to [0,1] range across all tokens"
                    />
                    <FormulaRow
                      label="Color"
                      formula="HSL(theme_hue + type_bias, 40 + salience×55, valence_light)"
                      description="Multi-dimensional color encoding (see Color System above)"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <strong>Highlights:</strong> Top 24 tokens by salience are rendered with 
                    additional glow spheres (size 0.08-0.2, glow 0.3-1.0)
                  </div>
                </div>
              </section>

              {/* Energy Particles */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Energy Particles (Token Mode)
                </h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <p className="text-gray-300 mb-3">
                    Each particle represents a word token with individual properties:
                  </p>
                  <div className="space-y-2 text-gray-300">
                    <FormulaRow
                      label="Size"
                      formula="0.1 + word_length × 0.03"
                      description="Particle size scales with word length"
                    />
                    <FormulaRow
                      label="Speed"
                      formula="0.5 + clamp(salience, 0, 1) × 0.9"
                      description="Important words move faster"
                    />
                    <FormulaRow
                      label="Direction"
                      formula="sentiment_label: POSITIVE=↑, NEGATIVE=↓, NEUTRAL=~"
                      description="Inherited from global sentiment analysis"
                    />
                    <FormulaRow
                      label="Hue Bias"
                      formula="(token_hue / 360) - base_hue_global"
                      description="Relative color shift from base emotion color"
                    />
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
                    <strong>Aggregate mode fallback:</strong> When token data unavailable, uses 
                    count=(word_count × 2), speed=max(sentiment, emphasis), randomized positions
                  </div>
                </div>
              </section>

              {/* AI Models */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">
                  ML Models & Processing Pipeline
                </h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-3">
                  <ModelInfo
                    name="Sentiment Analysis"
                    model="DistilBERT-SST2"
                    source="Xenova/distilbert-base-uncased-finetuned-sst-2-english"
                    size="~260 MB"
                    output="Per-sentence sentiment: POSITIVE/NEGATIVE (0-1 confidence)"
                    details="Fine-tuned on Stanford Sentiment Treebank. Calibrated with neutral margin 
                            (±0.15) for better neutral detection. Sentence-level scores aggregated 
                            with mean(signed_scores)."
                  />
                  <ModelInfo
                    name="Text Embedding"
                    model="all-MiniLM-L6-v2"
                    source="Xenova/all-MiniLM-L6-v2"
                    size="~90 MB"
                    output="384-dimensional dense vectors (mean-pooled, L2-normalized)"
                    details="Document and per-token embeddings. Salience calculated via cosine 
                            similarity with document vector. First 12 dimensions used for 
                            deterministic topic hash and visual parameters."
                  />
                </div>
              </section>

              {/* Stats Metrics */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Statistical Text Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MetricCard
                    label="Question Score"
                    value={meta?.questionScore?.toFixed(3)}
                    formula="min(1, question_marks / sentence_count)"
                    effect="Increases particle oscillation and turbulence"
                  />
                  <MetricCard
                    label="Emphasis Score"
                    value={meta?.emphasisScore?.toFixed(3)}
                    formula="min(1, (exclamations + caps_words×0.5) / sentences)"
                    effect="Boosts particle speed and energy intensity"
                  />
                  <MetricCard
                    label="Lexical Diversity"
                    value={meta?.lexicalDiversity?.toFixed(3)}
                    formula="unique_words / total_words (TTR)"
                    effect="Controls branch symmetry (0.4-0.95 range)"
                  />
                  <MetricCard
                    label="Sentence Variance"
                    value={meta?.varianceSentenceLength?.toFixed(2)}
                    formula="Σ(length_i - mean)² / n"
                    effect="Adds branches and complexity; increases particle size spread"
                  />
                </div>
              </section>

              {/* Determinism Note */}
              <section>
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-4">
                  <h4 className="text-cyan-300 font-semibold mb-2 flex items-center gap-2">
                    <Zap size={16} />
                    Deterministic Reproducibility
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    All randomness is <strong>seeded deterministically</strong> using a stable 
                    topic hash derived from the first 12 embedding dimensions. This ensures the 
                    same input text always produces the exact same visualization, making results 
                    reproducible and debuggable. The RNG uses: 
                    <code className="mx-1 px-1.5 py-0.5 bg-white/10 rounded text-cyan-300">
                      seed = (s × 1664525 + 1013904223) mod 2³²
                    </code>
                  </p>
                </div>
              </section>

              {/* Performance Notes */}
              <section>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                  <h4 className="text-amber-300 font-semibold mb-2">
                    Performance Optimizations
                  </h4>
                  <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                    <li>Sentences capped at 60 to prevent memory overflow</li>
                    <li>Token embeddings calculated only for first 256 words (salience ranking)</li>
                    <li>Embedding dimensions reduced to 12 for visual parameters</li>
                    <li>Instanced rendering for word nodes (single draw call)</li>
                    <li>Models cached in browser IndexedDB after first load (~350 MB one-time)</li>
                    <li>Token particles capped at 320 for smooth 60fps animation</li>
                  </ul>
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex-shrink-0">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-4">
                  <span>All formulas are deterministic</span>
                  <span className="text-gray-500">Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd> to close</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-white-500/10 hover:bg-white-500/20 text-white-300 
                             rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}

/* ============ Sub-Components ============ */

function DetailCard({ icon, title, value, formula, explanation, color = 'cyan' }) {
  const colorClasses = {
    cyan: { bg: 'from-cyan-500/10 to-cyan-500/5', border: 'border-cyan-500/20', icon: 'bg-cyan-500/10', text: 'text-cyan-400', value: 'text-cyan-300' },
    emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', icon: 'bg-emerald-500/10', text: 'text-emerald-400', value: 'text-emerald-300' },
    purple: { bg: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', icon: 'bg-purple-500/10', text: 'text-purple-400', value: 'text-purple-300' },
    blue: { bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', icon: 'bg-blue-500/10', text: 'text-blue-400', value: 'text-blue-300' },
    amber: { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', icon: 'bg-amber-500/10', text: 'text-amber-400', value: 'text-amber-300' },
  }
  
  const c = colorClasses[color]

  return (
    <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 ${c.icon} rounded-lg ${c.text} shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <h4 className="font-semibold text-white">{title}</h4>
            <span className={`${c.value} font-mono text-sm`}>{value}</span>
          </div>
          <code className="block text-xs bg-black/30 rounded px-2 py-1.5 mb-2 overflow-x-auto">
            {formula}
          </code>
          <p className="text-xs text-gray-300 leading-relaxed">{explanation}</p>
        </div>
      </div>
    </div>
  )
}

function ColorExplanation({ label, range, meaning, example }) {
  return (
    <div className="border border-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white text-sm">{label}</span>
        <span className="text-xs text-gray-400 font-mono">{range}</span>
      </div>
      <p className="text-xs text-gray-300 leading-relaxed mb-2">{meaning}</p>
      <div className="text-xs text-cyan-400 italic">{example}</div>
    </div>
  )
}

function FormulaRow({ label, formula, description }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
      <span className="font-semibold text-white min-w-[100px] shrink-0">{label}:</span>
      <div className="flex-1">
        <code className="block text-xs bg-black/30 rounded px-2 py-1 mb-1">{formula}</code>
        <span className="text-xs text-gray-400">{description}</span>
      </div>
    </div>
  )
}

function ModelInfo({ name, model, source, size, output, details }) {
  return (
    <div className="border border-white/10 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-white">{name}</h4>
          <p className="text-xs text-gray-400 mt-0.5">{model}</p>
        </div>
        <span className="text-xs text-cyan-400 font-mono">{size}</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div>
          <span className="text-gray-400">Source:</span>
          <code className="ml-2 text-cyan-300">{source}</code>
        </div>
        <div>
          <span className="text-gray-400">Output:</span>
          <span className="ml-2 text-gray-300">{output}</span>
        </div>
        <p className="text-gray-300 leading-relaxed mt-2">{details}</p>
      </div>
    </div>
  )
}

function MetricCard({ label, value, formula, effect }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-white text-sm">{label}</span>
        <span className="text-cyan-300 font-mono text-sm">{value}</span>
      </div>
      <code className="block text-xs bg-black/30 rounded px-2 py-1 mb-2">{formula}</code>
      <p className="text-xs text-gray-400">
        <strong className="text-gray-300">Effect:</strong> {effect}
      </p>
    </div>
  )
}