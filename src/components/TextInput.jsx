export default function TextInput({ value, onChange, disabled }) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Write anything... your thoughts, a story, a dream..."
        className="w-full h-40 p-4 rounded-lg bg-white/5 border border-white/10 
                   text-white placeholder-gray-500 resize-none
                   focus:outline-none focus:border-cyan-500/50 focus:bg-white/10
                   transition-all backdrop-blur-sm
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="mt-2 text-sm text-gray-500">
        {value.length} characters • {value.split(/\s+/).filter(Boolean).length} words
      </div>
    </div>
  )
}