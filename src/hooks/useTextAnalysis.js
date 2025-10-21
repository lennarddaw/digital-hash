// src/hooks/useTextAnalysis.js
import { useState, useEffect, useRef } from 'react'
import { analyzeText } from '../ai/textAnalyzer'
import { mapToBloomData } from '../ai/bloomMapper'
import { loadModels } from '../ai/modelLoader'

export default function useTextAnalysis(text) {
  const [bloomData, setBloomData] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isModelLoading, setIsModelLoading] = useState(true)
  const abortRef = useRef(false)
  
  // Modelle beim Start laden
  useEffect(() => {
    let mounted = true
    
    loadModels()
      .then(() => {
        if (mounted) setIsModelLoading(false)
      })
      .catch((error) => {
        console.error('Model loading failed:', error)
        if (mounted) setIsModelLoading(false)
      })
    
    return () => {
      mounted = false
    }
  }, [])
  
  // Text analysieren mit Debounce
  useEffect(() => {
    if (!text || text.length < 10) {
      setBloomData(null)
      setAnalysisResult(null)
      return
    }
    
    if (isModelLoading) return
    
    const timeout = setTimeout(async () => {
      abortRef.current = false
      setIsAnalyzing(true)
      
      try {
        // Text analysieren
        const analysis = await analyzeText(text)
        
        if (abortRef.current) return
        
        // Raw analysis data speichern (für Analysis Panel)
        setAnalysisResult(analysis)
        
        // Zu Bloom-Daten mappen
        const mapped = mapToBloomData(analysis)
        
        if (!abortRef.current) {
          setBloomData(mapped)
        }
      } catch (error) {
        console.error('Analysis failed:', error)
        if (!abortRef.current) {
          setBloomData(null)
          setAnalysisResult(null)
        }
      } finally {
        if (!abortRef.current) {
          setIsAnalyzing(false)
        }
      }
    }, 1000) // 1 Sekunde Debounce
    
    return () => {
      clearTimeout(timeout)
      abortRef.current = true
    }
  }, [text, isModelLoading])
  
  return { 
    bloomData, 
    analysisResult,  // NEU: Raw analysis data für visualization
    isAnalyzing, 
    isModelLoading 
  }
}