// src/components/MusicPlayer.jsx
/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, Volume2, VolumeX } from 'lucide-react'

export default function MusicPlayer({
  playlist = [],
  startIndex = 0,
  className = '',
  autoPlay = false,
}) {
  const audioRef = useRef(null)
  const progressRef = useRef(null)

  const [index, setIndex] = useState(startIndex)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoop, setIsLoop] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [muted, setMuted] = useState(false)

  const track = playlist[index] || {}
  const hasAudio = playlist.length > 0

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = muted ? 0 : volume
    audioRef.current.muted = muted
  }, [volume, muted])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.loop = isLoop
  }, [isLoop])

  useEffect(() => {
    if (!audioRef.current) return
    setCurrentTime(0)
    setDuration(0)
    const audio = audioRef.current
    audio.load()
    const playIfNeeded = async () => {
      if (autoPlay || isPlaying) {
        try { await audio.play(); setIsPlaying(true) } catch { setIsPlaying(false) }
      }
    }
    playIfNeeded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const onPlayPause = async () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { try { await audioRef.current.play(); setIsPlaying(true) } catch { setIsPlaying(false) } }
  }

  const onPrev = () => {
    if (!hasAudio) return
    if (audioRef.current?.currentTime > 2) { audioRef.current.currentTime = 0; return }
    setIndex((i) => (isShuffle ? randomIndex(playlist.length, i) : (i - 1 + playlist.length) % playlist.length))
  }
  const onNext = () => {
    if (!hasAudio) return
    setIndex((i) => (isShuffle ? randomIndex(playlist.length, i) : (i + 1) % playlist.length))
  }

  const onTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime || 0)
  const onLoadedMetadata = () => setDuration(audioRef.current?.duration || 0)
  const onSeek = (e) => { if (audioRef.current) { const v = Number(e.target.value); audioRef.current.currentTime = v; setCurrentTime(v) } }
  const onEnded = () => (isLoop ? audioRef.current?.play() : onNext())
  const timeFmt = (t) => { if (!Number.isFinite(t)) return '0:00'; const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2,'0')}` }
  const cover = useMemo(() => track.cover || null, [track.cover])

  return (
    <div className={`pointer-events-auto select-none rounded-xl bg-black/40 border border-white/10 backdrop-blur p-3 ${className}`}>
      <audio
        ref={audioRef}
        src={track?.src}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        {cover ? (
          <img src={cover} alt="" className="w-12 h-12 rounded-md object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-md bg-white/10 flex items-center justify-center text-xs text-white/70">AUDIO</div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{track?.title ?? '—'}</div>
          <div className="truncate text-xs text-white/60">{track?.artist ?? 'Local track'}</div>
        </div>
      </div>

      {/* Transport */}
      <div className="mt-3 flex items-center gap-2">
        <button className={`p-2 rounded hover:bg-white/10 ${isShuffle ? 'text-cyan-300' : 'text-white/80'}`} title="Shuffle" onClick={() => setIsShuffle((s) => !s)}>
          <Shuffle size={16} />
        </button>
        <button className="p-2 rounded hover:bg-white/10 text-white/90" onClick={onPrev} title="Previous"><SkipBack size={18} /></button>
        <button className="p-2 rounded bg-white/15 hover:bg-white/25 text-white" onClick={onPlayPause} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="p-2 rounded hover:bg-white/10 text-white/90" onClick={onNext} title="Next"><SkipForward size={18} /></button>
        <button className={`p-2 rounded hover:bg-white/10 ${isLoop ? 'text-cyan-300' : 'text-white/80'}`} title="Repeat" onClick={() => setIsLoop((l) => !l)}>
          <Repeat size={16} />
        </button>
      </div>

      {/* Seek (schwarz) */}
      <div className="mt-2">
        <input
          ref={progressRef}
          type="range"
          min={0}
          max={Number.isFinite(duration) ? Math.max(duration, 0) : 0}
          step="0.01"
          value={currentTime}
          onChange={onSeek}
          className="w-full accent-gray-400 range-gray"
        />
        <div className="flex justify-between text-[10px] text-white/60 mt-1">
          <span>{timeFmt(currentTime)}</span>
          <span>{timeFmt(duration)}</span>
        </div>
      </div>

      {/* Volume – EIGENE ZEILE, schwarzer Slider */}
      <div className="mt-2 flex items-center gap-2">
        <button
          className="p-2 rounded hover:bg-white/10 text-white/80"
          title={muted ? 'Unmute' : 'Mute'}
          onClick={() => setMuted((m) => !m)}
        >
          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-gray-400 range-gray"
        />
      </div>

      {/* Playlist (mit schöner Scrollbar) */}
      {playlist.length > 1 && (
        <div className="mt-3 max-h-32 overflow-auto pr-1 nice-scroll">
          {playlist.map((t, i) => (
            <button
              key={i}
              className={`w-full text-left px-2 py-1 rounded hover:bg-white/10 text-xs ${i === index ? 'bg-white/10 text-white' : 'text-white/80'}`}
              onClick={() => setIndex(i)}
            >
              <span className="font-medium">{t.title}</span>
              <span className="text-white/60"> — {t.artist}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function randomIndex(n, exclude) {
  if (n <= 1) return 0
  let r = Math.floor(Math.random() * n)
  if (r === exclude) r = (r + 1) % n
  return r
}