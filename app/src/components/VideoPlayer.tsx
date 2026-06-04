import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

export interface VideoPlayerHandle {
  seekToTime: (isoTime: string) => void
}

interface Props {
  url:         string
  title?:      string
  showControls?: boolean  // dışarıdan kontrol görünürlüğü
}

function fmt(sec: number) {
  if (!isFinite(sec)) return '--:--'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({ url, showControls = true }, ref) => {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const hlsRef      = useRef<Hls | null>(null)
  const [playing,   setPlaying]   = useState(false)
  const [volume,    setVolume]     = useState(1)
  const [muted,     setMuted]      = useState(false)
  const [currentT,  setCurrentT]   = useState(0)
  const [duration,  setDuration]   = useState(0)
  const [isLive,    setIsLive]     = useState(true)

  useImperativeHandle(ref, () => ({
    seekToTime(isoTime: string) {
      const video = videoRef.current
      if (!video) return
      const targetTs  = new Date(isoTime).getTime() / 1000
      const nowTs     = Date.now() / 1000
      const offsetSec = nowTs - targetTs
      const dur       = video.duration
      if (!isFinite(dur) || dur <= 0) return
      const seekPos = dur - offsetSec
      if (seekPos >= 0 && seekPos <= dur) {
        video.currentTime = seekPos
        video.play().catch(() => {})
      }
    }
  }))

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return
    hlsRef.current?.destroy()

    const onPlay     = () => setPlaying(true)
    const onPause    = () => setPlaying(false)
    const onTimeUpd  = () => {
      setCurrentT(video.currentTime)
      setDuration(video.duration)
      setIsLive(!isFinite(video.duration) || video.duration > 86400)
    }
    const onVolChg   = () => { setVolume(video.volume); setMuted(video.muted) }

    video.addEventListener('play',        onPlay)
    video.addEventListener('pause',       onPause)
    video.addEventListener('timeupdate',  onTimeUpd)
    video.addEventListener('volumechange',onVolChg)

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, backBufferLength: 3600 })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
    } else {
      video.src = url
      video.play().catch(() => {})
    }

    return () => {
      video.removeEventListener('play',        onPlay)
      video.removeEventListener('pause',       onPause)
      video.removeEventListener('timeupdate',  onTimeUpd)
      video.removeEventListener('volumechange',onVolChg)
      hlsRef.current?.destroy()
    }
  }, [url])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.paused ? v.play().catch(() => {}) : v.pause()
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
  }, [])

  const goLive = useCallback(() => {
    const v = videoRef.current
    if (!v || !isFinite(v.duration)) return
    v.currentTime = v.duration
    v.play().catch(() => {})
  }, [])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Number(e.target.value)
  }, [])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    v.volume = Number(e.target.value)
    v.muted  = false
  }, [])

  const toggleFS = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (!document.fullscreenElement) v.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }, [])

  const atLive = isLive || (isFinite(duration) && duration - currentT < 5)

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      {/* Video */}
      <video
        ref={videoRef}
        className="flex-1 w-full h-full object-contain cursor-pointer"
        playsInline
        onClick={togglePlay}
      />

      {/* Özel kontroller */}
      <div
        className={`shrink-0 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Seek bar */}
        {!isLive && isFinite(duration) && duration > 0 && (
          <div className="px-4 pt-2">
            <input
              type="range" min={0} max={duration} step={1}
              value={currentT}
              onChange={handleSeek}
              className="w-full h-1 accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-0.5">
              <span>{fmt(currentT)}</span>
              <span>-{fmt(duration - currentT)}</span>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-red-400 transition-colors">
            {playing ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Canlıya dön */}
          {!atLive && (
            <button onClick={goLive}
              className="text-[10px] text-red-400 border border-red-500/50 rounded px-2 py-0.5 hover:bg-red-900/30">
              ● CANLI
            </button>
          )}
          {atLive && (
            <span className="text-[10px] text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              CANLI
            </span>
          )}

          {/* Ses */}
          <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors ml-1">
            {muted || volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
            )}
          </button>
          <input
            type="range" min={0} max={1} step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 h-1 accent-white cursor-pointer"
          />

          <div className="flex-1" />

          {/* Tam ekran */}
          <button onClick={toggleFS} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
export default VideoPlayer
