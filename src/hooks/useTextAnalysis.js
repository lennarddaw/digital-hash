import { useState, useEffect } from 'react'
import { analyzeText } from '../ai/textAnalyzer'
import { mapToBloomData } from '../ai/bloomMapper'
import { loadModels } from '../ai/modelLoader'

export default function useTextAnalysis(text) {
  const [bloomData, setBloomData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(true)
  
  // Modelle beim Start laden
  useEffect(() => {
    loadModels()
      .then(() => setIsModelLoading(false))
      .catch(console.error)
  }, [])
  
  // Text analysieren mit Debounce
  useEffect(() => {
    if (!text || text.length < 10) {
      setBloomData(null)
      return
    }
    
    const timeout = setTimeout(async () => {
      setIsAnalyzing(true)
      try {
        const analysis = await analyzeText(text)
        const mapped = mapToBloomData(analysis)
        setBloomData(mapped)
      } catch (error) {
        console.error('Analysis failed:', error)
      } finally {
        setIsAnalyzing(false)
      }
    }, 1000) // 1 Sekunde Debounce
    
    return () => clearTimeout(timeout)
  }, [text])
  
  return { bloomData, isAnalyzing, isModelLoading }
}