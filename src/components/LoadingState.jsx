export default function LoadingState({ type }) {
  const messages = {
    model: 'Loading AI models... (first time only)',
    analysis: 'Analyzing your text...'
  }
  
  return (
    <div className="mt-4 flex items-center gap-3 text-cyan-400">
      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <span>{messages[type]}</span>
    </div>
  )
}