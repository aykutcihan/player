import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { CapacitorHttpLoader, useCapacitorHttpLoader, getDebugLog } from '../lib/capacitorHlsLoader'

export interface VideoPlayerHandle {
  seekToTime:  (isoTime: string) => void
  togglePlay?: () => void
}

interface Props {
  url:          string
  urls?:        string[]  // fallback URL listesi
  title?:       string
  showControls?: boolean
}

function fmt(sec: number) {
  if (!isFinite(sec)) return '--:--'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

async function fetchBandwidth(url: string, signal: AbortSignal): Promise<number> {
  if (!url.includes('.m3u8')) return 1_000_000
  try {
    const res = await fetch(url, { signal, mode: 'cors' })
    if (!res.ok) return 0
    const text = await res.text()
    const bws = [...text.matchAll(/BANDWIDTH=(\d+)/g)].map(m => parseInt(m[1]))
    return bws.length ? Math.max(...bws) : 1_000_000
  } catch {
    return signal.aborted ? -1 : 0
  }
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({ url, urls }, ref) => {
  const videoRef       = useRef<HTMLVideoElement>(null)
  const hlsRef         = useRef<Hls | null>(null)
  const urlListRef     = useRef<string[]>([])
  const urlIdxRef      = useRef(0)
  const upgradeCtrlRef = useRef<AbortController | null>(null)
  const [activeUrl, setActiveUrl] = useState(url)
  const [playing,   setPlaying]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
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
    },
    togglePlay() {
      const v = videoRef.current
      if (!v) return
      v.paused ? v.play().catch(() => {}) : v.pause()
    }
  }))

  // Kanal değişince URL listesini sıfırla, upgrade'i iptal et
  useEffect(() => {
    upgradeCtrlRef.current?.abort()
    urlListRef.current = urls && urls.length > 0 ? urls : [url]
    urlIdxRef.current  = 0
    setActiveUrl(urlListRef.current[0])
  }, [url, urls])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeUrl) return
    hlsRef.current?.destroy()

    setLoading(true)
    setError(false)

    // Cleanup sonrası ateşlenen stale Promise .catch() callback'lerini engeller.
    // video.play() Promise'i effect temizlendikten sonra reject edebilir; bu flag
    // olmadan eski closure urlIdxRef'i yanlış ilerletir ve çalışan URL'ler atlanır.
    let cancelled = false

    const tryNextUrl = () => {
      if (cancelled) return
      const list = urlListRef.current
      const next = urlIdxRef.current + 1
      if (next < list.length) {
        urlIdxRef.current = next
        setActiveUrl(list[next])
      } else {
        setLoading(false)
        setError(true)
      }
    }

    // Sessiz arıza koruması: URL ne error event'i ne de play() reddi ile haber verir,
    // sadece sonsuza dek "yükleniyor" durumunda kalırsa belirli sürede bir sonraki URL'e geç.
    let stallTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      stallTimer = null
      tryNextUrl()
    }, 12000)
    const clearStallTimer = () => {
      if (stallTimer !== null) { clearTimeout(stallTimer); stallTimer = null }
    }

    const onPlay    = () => { clearStallTimer(); setPlaying(true); setLoading(false) }
    const onPause   = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onPlaying = () => {
      setLoading(false)
      // Arka planda kalite kontrolü — 2sn sonra daha yüksek öncelikli URL'leri ölç
      // Sadece mevcut URL'den daha önce gelen adaylar denenir; düşük öncelikli kaynağa
      // geçiş yapılmaz (token süresi dolmuş kaynağa upgrade→fail→döngü sorununu önler)
      upgradeCtrlRef.current?.abort()
      const ctrl = new AbortController()
      upgradeCtrlRef.current = ctrl
      setTimeout(async () => {
        if (ctrl.signal.aborted) return
        const allUrls    = urlListRef.current
        const currentIdx = urlIdxRef.current
        const candidates = allUrls.slice(0, currentIdx) // yalnızca daha yüksek öncelikli
        if (candidates.length === 0) return
        const [currentBw, ...candidateBws] = await Promise.all([
          fetchBandwidth(activeUrl, ctrl.signal),
          ...candidates.map(u => fetchBandwidth(u, ctrl.signal)),
        ])
        if (ctrl.signal.aborted) return
        const best = candidates
          .map((u, i) => ({ url: u, bw: candidateBws[i], idx: i }))
          .filter(x => x.bw > 0 && x.bw > (currentBw ?? 0))
          .sort((a, b) => b.bw - a.bw)[0]
        if (best) {
          urlIdxRef.current = best.idx  // fallback chain doğru yerden devam etsin
          setActiveUrl(best.url)
        }
      }, 2000)
    }
    const onError   = () => tryNextUrl()
    const onTimeUpd  = () => {
      setCurrentT(video.currentTime)
      setDuration(video.duration)
      setIsLive(!isFinite(video.duration) || video.duration > 86400)
    }
    const onVolChg = () => { setVolume(video.volume); setMuted(video.muted) }

    video.addEventListener('play',         onPlay)
    video.addEventListener('pause',        onPause)
    video.addEventListener('waiting',      onWaiting)
    video.addEventListener('playing',      onPlaying)
    video.addEventListener('timeupdate',   onTimeUpd)
    video.addEventListener('volumechange', onVolChg)
    video.addEventListener('error',        onError)

    const tryNative = () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
      video.src = activeUrl
      video.play().catch(() => tryNextUrl())
    }

    if (activeUrl.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 3600,
        // CORS header'ı olmayan kaynaklar (tvkulesi vb.) WebView'da engellenir;
        // native platformda istekleri CapacitorHttp üzerinden native HTTP'ye yönlendirip
        // tarayıcı CORS kısıtlamasını by-pass ediyoruz.
        ...(useCapacitorHttpLoader() ? { loader: CapacitorHttpLoader } : {}),
      })
      hlsRef.current = hls
      let mediaRecovered = false
      hls.loadSource(activeUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
          mediaRecovered = true
          hls.recoverMediaError()
        } else {
          tryNative()
        }
      })
    } else {
      video.src = activeUrl
      video.play().catch(() => tryNextUrl())
    }

    return () => {
      cancelled = true
      clearStallTimer()
      video.removeEventListener('play',        onPlay)
      video.removeEventListener('pause',       onPause)
      video.removeEventListener('waiting',     onWaiting)
      video.removeEventListener('playing',     onPlaying)
      video.removeEventListener('timeupdate',  onTimeUpd)
      video.removeEventListener('volumechange',onVolChg)
      video.removeEventListener('error',       onError)
      hlsRef.current?.destroy()
    }
  }, [activeUrl])

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
      {/* Yükleniyor spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Hata */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none gap-3">
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-white/30" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div className="text-white/50 text-lg">Yayın yüklenemedi</div>
          {/* Geçici teşhis bilgisi — cihazda DevTools erişimi olmadan loader durumunu görmek için */}
          <div className="text-white/30 text-[10px] font-mono text-center max-w-[90%] leading-tight">
            {getDebugLog().map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
      {/* Video */}
      <video
        ref={videoRef}
        className="flex-1 w-full h-full object-contain cursor-pointer"
        playsInline
        onClick={togglePlay}
      />

      {/* Kontroller gizli */}
      <div className="hidden">
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
