// src/components/ModelSelector.jsx
import { Languages } from 'lucide-react'

const MODEL_CONFIGS = [
  {
    id: 'en',
    label: 'English',
    flag: '🇬🇧',
    description: 'Optimized for English text'
  },
  {
    id: 'de',
    label: 'Deutsch',
    flag: '🇩🇪',
    description: 'Optimiert für deutsche Texte'
  }
]

export default function ModelSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-gray-400">
        <Languages size={14} />
        <span>Model Language</span>
      </label>
      
      <div className="flex gap-2">
        {MODEL_CONFIGS.map((config) => (
          <button
            key={config.id}
            onClick={() => onChange(config.id)}
            disabled={disabled}
            className={`
              flex-1 px-4 py-2.5 rounded-lg
              transition-all duration-200
              flex items-center justify-center gap-2
              text-sm font-medium
              ${value === config.id
                ? 'bg-white/10 text-white border-2 border-white/30 shadow-lg'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/8 hover:border-white/20'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={config.description}
          >
            <span className="text-lg">{config.flag}</span>
            <span>{config.label}</span>
          </button>
        ))}
      </div>
      
      {value && (
        <p className="text-xs text-gray-500 mt-1">
          {MODEL_CONFIGS.find(c => c.id === value)?.description}
        </p>
      )}
    </div>
  )
}