// src/hooks/useAudioAnalysis.js
import { useEffect, useRef, useState } from 'react'

/**
 * Hook für Echtzeit-Audio-Analyse
 * Extrahiert Frequenzen und Amplitude aus einem Audio-Element
 */
export default function useAudioAnalysis(audioElement, isPlaying) {
  const [audioData, setAudioData] = useState({
    bass: 0,        // 0-1: Tiefe Frequenzen (20-150 Hz)
    mid: 0,         // 0-1: Mittlere Frequenzen (150-4000 Hz)
    treble: 0,      // 0-1: Hohe Frequenzen (4000-20000 Hz)
    amplitude: 0,   // 0-1: Gesamtlautstärke
    energy: 0,      // 0-1: Gesamt-Energie (gewichteter Mix)
  })

  const contextRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)

  useEffect(() => {
    if (!audioElement) return

    // Audio Context & Analyser nur einmal erstellen
    if (!contextRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        
        // Analyser-Konfiguration
        analyser.fftSize = 256 // Höhere Auflösung für bessere Frequenz-Analyse
        analyser.smoothingTimeConstant = 0.7 // Glättung für weniger Flackern
        
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        
        // Audio-Element mit Analyser verbinden
        const source = audioContext.createMediaElementSource(audioElement)
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        
        contextRef.current = audioContext
        analyserRef.current = analyser
        sourceRef.current = source
        dataArrayRef.current = dataArray
      } catch (error) {
        console.error('Audio Context creation failed:', error)
        return
      }
    }

    // Analyse-Loop
    const analyze = () => {
      if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
        animationFrameRef.current = requestAnimationFrame(analyze)
        return
      }

      const analyser = analyserRef.current
      const dataArray = dataArrayRef.current
      
      // Frequenzdaten abrufen
      analyser.getByteFrequencyData(dataArray)
      
      const bufferLength = dataArray.length
      
      // Frequenzbereiche definieren (basierend auf 44.1kHz Sample Rate)
      // Bei fftSize=256 haben wir 128 Bins, die 0-22050 Hz abdecken
      // Jeder Bin repräsentiert ~172 Hz
      const bassEnd = Math.floor(bufferLength * 0.1)      // 0-10% (ca. 0-2200 Hz)
      const midEnd = Math.floor(bufferLength * 0.5)       // 10-50% (ca. 2200-11000 Hz)
      
      // Bass-Frequenzen (Low)
      let bassSum = 0
      for (let i = 0; i < bassEnd; i++) {
        bassSum += dataArray[i]
      }
      const bass = bassSum / (bassEnd * 255)
      
      // Mid-Frequenzen
      let midSum = 0
      for (let i = bassEnd; i < midEnd; i++) {
        midSum += dataArray[i]
      }
      const mid = midSum / ((midEnd - bassEnd) * 255)
      
      // Treble-Frequenzen (High)
      let trebleSum = 0
      for (let i = midEnd; i < bufferLength; i++) {
        trebleSum += dataArray[i]
      }
      const treble = trebleSum / ((bufferLength - midEnd) * 255)
      
      // Gesamtamplitude (Durchschnitt aller Frequenzen)
      let totalSum = 0
      for (let i = 0; i < bufferLength; i++) {
        totalSum += dataArray[i]
      }
      const amplitude = totalSum / (bufferLength * 255)
      
      // Energie (gewichteter Mix: Bass stärker gewichtet für "Punch")
      const energy = (bass * 0.5 + mid * 0.3 + treble * 0.2)
      
      // State aktualisieren
      setAudioData({
        bass: Math.min(1, bass * 1.5),        // Leichte Verstärkung
        mid: Math.min(1, mid * 1.3),
        treble: Math.min(1, treble * 1.2),
        amplitude: amplitude,
        energy: Math.min(1, energy * 1.4),
      })
      
      animationFrameRef.current = requestAnimationFrame(analyze)
    }

    // Analyse starten
    analyze()

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [audioElement, isPlaying])

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (contextRef.current && contextRef.current.state !== 'closed') {
        contextRef.current.close()
      }
    }
  }, [])

  return audioData
}