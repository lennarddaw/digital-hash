import { useState } from 'react'
import TextInput from './components/TextInput'
import BloomCanvas from './components/BloomCanvas'
import LoadingState from './components/LoadingState'
import ExportButton from './components/ExportButton'
import useTextAnalysis from './hooks/useTextAnalysis'

export default function App() {
  const [userText, setUserText] = useState('')
  const { bloomData, isAnalyzing, isModelLoading } = useTextAnalysis(userText)

  return (
    <div className="w-full h-full relative">
      {/* 3D Background */}
      <BloomCanvas bloomData={bloomData} />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto p-8 max-w-2xl">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Neural Bloom
          </h1>
          <p className="text-gray-400 mb-6">
            Transform your thoughts into living structures
          </p>
          
          <TextInput 
            value={userText}
            onChange={setUserText}
            disabled={isAnalyzing}
          />
          
          {isModelLoading && <LoadingState type="model" />}
          {isAnalyzing && <LoadingState type="analysis" />}
        </div>
        
        {bloomData && (
          <div className="absolute bottom-8 right-8 pointer-events-auto">
            <ExportButton />
          </div>
        )}
      </div>
    </div>
  )
}