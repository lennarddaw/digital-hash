// src/components/FocusModeToggle.jsx
import { Eye, EyeOff } from 'lucide-react'

/**
 * FocusModeToggle - Subtiler Toggle für Focus Mode
 * Blendet alle UI-Elemente sanft aus für ungestörte 3D-Ansicht
 * 
 * @param {boolean} isFocused - Aktueller Focus Mode Status
 * @param {function} onToggle - Callback beim Toggle
 * @param {string} className - Optionale zusätzliche CSS-Klassen
 */
export default function FocusModeToggle({ 
  isFocused = false, 
  onToggle, 
  className = '' 
}) {
  return (
    <div 
      className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto ${className}`}
      role="region"
      aria-label="Focus mode controls"
    >
      <button
        onClick={onToggle}
        className="group flex items-center gap-2 px-4 py-2 rounded-full 
                   bg-black/30 hover:bg-black/50 
                   border border-white/10 hover:border-white/20 
                   backdrop-blur-md 
                   transition-all duration-300 
                   shadow-lg hover:shadow-xl
                   focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-black"
        aria-label={isFocused ? 'Exit focus mode and show UI' : 'Enter focus mode and hide UI'}
        aria-pressed={isFocused}
        title={isFocused ? 'Show UI (Esc)' : 'Focus Mode (F)'}
      >
        {isFocused ? (
          <>
            <Eye 
              size={16} 
              className="text-white/70 group-hover:text-white transition-colors"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">
              Show UI
            </span>
          </>
        ) : (
          <>
            <EyeOff 
              size={16} 
              className="text-white/70 group-hover:text-white transition-colors"
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">
              Focus
            </span>
          </>
        )}
      </button>

      {/* Keyboard Hint - nur sichtbar beim ersten Laden */}
      {!isFocused && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 
                        text-[10px] text-white/40 whitespace-nowrap
                        opacity-0 group-hover:opacity-100 transition-opacity">
          Press <kbd className="px-1 py-0.5 bg-white/10 rounded">F</kbd> or <kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd>
        </div>
      )}
    </div>
  )
}