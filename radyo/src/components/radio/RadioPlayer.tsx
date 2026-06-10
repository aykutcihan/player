import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'
import { fetchAllNowPlaying, type NowPlaying } from '../../lib/nowplaying'
import { fetchEpg, currentProgramme, type Programme } from '../../lib/epg'
import { fetchPowerNowPlaying, fetchKarnavalNowPlaying, fetchShowNowPlaying, fetchOzgurNowPlaying, fetchFenomenNowPlaying, fetchVivaNowPlaying, fetchRadyo7NowPlaying, fetchRadyohomeNowPlaying, fetchHerkulNowPlaying, fetchRadyoKuranNowPlaying } from '../../lib/powerplaying'

export function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)

  useEffect(() => {
    const el     = textRef.current
    const parent = containerRef.current
    if (!el || !parent) return
    const overflow = el.scrollWidth - parent.clientWidth
    setShift(overflow > 0 ? overflow : 0)
  }, [text])

  const dur = shift > 0 ? Math.max(4, shift / 30) : 0

  return (
    <div ref={containerRef} className="overflow-hidden w-full">
      {shift > 0 && (
        <style>{`@keyframes mq{0%,15%{transform:translateX(0)}70%,85%{transform:translateX(-${shift}px)}100%{transform:translateX(0)}}`}</style>
      )}
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${className ?? ''}`}
        style={shift > 0 ? { animation: `mq ${dur}s ease-in-out infinite` } : {}}
      >
        {text}
      </span>
    </div>
  )
}

interface Props {
  channel: Channel
  onPrev?: () => void
  onNext?: () => void
  mediaOnPrev?: () => void  // araba/kulaklık tuşları için — her zaman çalışır
  mediaOnNext?: () => void
  playBtnRef?: React.RefObject<HTMLButtonElement | null>
  onPlayKeyDown?: (e: React.KeyboardEvent) => void
  onSongChange?: (song: NowPlaying | null) => void
  onProgramChange?: (program: Programme | null) => void
}

export default function RadioPlayer({ channel, onPrev, onNext, mediaOnPrev, mediaOnNext, playBtnRef, onPlayKeyDown, onSongChange, onProgramChange }: Props) {
  const audioRef   = useRef<HTMLAudioElement>(null)
  const prevBtnRef = useRef<HTMLButtonElement>(null)
  const nextBtnRef = useRef<HTMLButtonElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error,   setError]   = useState(false)
  const [song,    setSong]    = useState<NowPlaying | null>(null)
  const [program, setProgram] = useState<Programme | null>(null)

  // Stream
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setError(false)
    setPlaying(false)
    audio.src = channel.url
    audio.play().then(() => setPlaying(true)).catch(() => setError(true))
  }, [channel.url])

  // TRT radyo için EPG programı
  useEffect(() => {
    if (!channel.tvgId.startsWith('trt.radyo.')) {
      setProgram(null)
      return
    }
    fetchEpg(channel.tvgId).then(progs => setProgram(currentProgramme(progs)))
    const t = setInterval(() => {
      fetchEpg(channel.tvgId).then(progs => setProgram(currentProgramme(progs)))
    }, 60000)
    return () => clearInterval(t)
  }, [channel.tvgId])

  // Power, Karnaval ve diğer Worker kanalları
  useEffect(() => {
    const isPower     = channel.tvgId.startsWith('powerapp.')
    const isKarnaval  = channel.tvgId.startsWith('karnaval.')
    const isShow      = channel.tvgId.startsWith('show.')
    const isOzgur     = channel.tvgId.startsWith('ozgur.')
    const isFenomen   = channel.tvgId.startsWith('fenomen.')
    const isViva      = channel.tvgId.startsWith('viva.')
    const isRadyo7    = channel.tvgId.startsWith('radyo7.')
    const isRadyohome = channel.tvgId.startsWith('radyohome.')
    const isHerkul    = channel.tvgId.startsWith('herkul.') || channel.tvgId.startsWith('cihan.')
    const isRadyoKuran = channel.tvgId === 'radyokuran.fm'
    if (!isPower && !isKarnaval && !isShow && !isOzgur && !isFenomen && !isViva && !isRadyo7 && !isRadyohome && !isHerkul && !isRadyoKuran) return
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      let info = null
      if (isPower)         info = await fetchPowerNowPlaying(channel.tvgId)
      else if (isKarnaval) info = await fetchKarnavalNowPlaying(channel.tvgId)
      else if (isShow)     info = await fetchShowNowPlaying(channel.tvgId)
      else if (isOzgur)    info = await fetchOzgurNowPlaying(channel.tvgId)
      else if (isFenomen)  info = await fetchFenomenNowPlaying(channel.tvgId)
      else if (isViva)     info = await fetchVivaNowPlaying(channel.tvgId)
      else if (isRadyo7)   info = await fetchRadyo7NowPlaying(channel.tvgId)
      else if (isRadyohome)info = await fetchRadyohomeNowPlaying(channel.tvgId)
      else if (isHerkul)   info = await fetchHerkulNowPlaying(channel.tvgId)
      else if (isRadyoKuran)info = await fetchRadyoKuranNowPlaying(channel.tvgId)
      if (info) setSong(info)
      timer = setTimeout(refresh, 30000)
    }
    refresh()
    return () => clearTimeout(timer)
  }, [channel.tvgId])

  // Number1 ve Turkuvaz için şarkı bilgisi (GitHub JSON)
  useEffect(() => {
    const isJson = channel.tvgId.startsWith('number1.') || channel.tvgId.startsWith('turkuvaz.')
    if (!isJson) {
      const isWorker = channel.tvgId.startsWith('powerapp.') || channel.tvgId.startsWith('karnaval.') || channel.tvgId.startsWith('show.') || channel.tvgId.startsWith('ozgur.') || channel.tvgId.startsWith('fenomen.') || channel.tvgId.startsWith('viva.') || channel.tvgId.startsWith('radyo7.') || channel.tvgId.startsWith('radyohome.') || channel.tvgId.startsWith('herkul.') || channel.tvgId.startsWith('cihan.') || channel.tvgId === 'radyokuran.fm'
      if (!isWorker) setSong(null)
      return
    }
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      const all = await fetchAllNowPlaying()
      setSong(all[channel.tvgId] ?? null)
      timer = setTimeout(refresh, 30000)
    }
    refresh()
    return () => clearTimeout(timer)
  }, [channel.tvgId])

  // Callback'ler
  useEffect(() => { onSongChange?.(song) },       [song])
  useEffect(() => { onProgramChange?.(program) }, [program])

  // Media Session API — kilit ekranı / bildirim
  useEffect(() => {
    // document.title → Safari kilit ekranı fallback
    const trackTitle = song?.title
      ? `${channel.name} · ${song.title}${song.artist ? ` — ${song.artist}` : ''}`
      : channel.name
    document.title = trackTitle
    return () => { document.title = 'Stepup' }
  }, [song, channel.name])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  song?.title  || channel.name,
      artist: song?.artist || '',
      album:  channel.name,
      artwork: channel.logo ? [{ src: channel.logo, sizes: '512x512' }] : [],
    })
  }, [song, channel.name, channel.logo])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {})
      setPlaying(true)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause()
      setPlaying(false)
    })
    // mediaOnPrev/Next her zaman çalışır (araba/kulaklık), yoksa ekran butonu fallback
    try { navigator.mediaSession.setActionHandler('previoustrack', mediaOnPrev ?? onPrev ?? null) } catch {}
    try { navigator.mediaSession.setActionHandler('nexttrack',     mediaOnNext ?? onNext ?? null) } catch {}
  }, [onPrev, onNext, mediaOnPrev, mediaOnNext])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => setError(true)); setPlaying(true) }
  }

  return (
    <div className="relative flex flex-col w-full justify-center">
      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-2 py-3 shrink-0">
        {error && <div className="text-red-400 text-xs">Stream yüklenemedi</div>}
        <div className="flex items-center justify-center gap-[5%] w-full max-w-[240px] mx-auto px-[8%]">
          <button
            ref={prevBtnRef}
            onClick={onPrev}
            disabled={!onPrev}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') { e.preventDefault(); playBtnRef?.current?.focus() }
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') onPlayKeyDown?.(e)
            }}
            className="flex-1 aspect-square rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-20 disabled:cursor-default flex items-center justify-center text-white transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-[45%] h-[45%]" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
            </svg>
          </button>
          <button
            ref={playBtnRef}
            onClick={toggle}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtnRef.current?.focus() }
              if (e.key === 'ArrowRight') { e.preventDefault(); nextBtnRef.current?.focus() }
              else onPlayKeyDown?.(e)
            }}
            className="flex-1 aspect-square rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all"
          >
            {playing
              ? <svg viewBox="0 0 24 24" className="w-[45%] h-[45%]" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg viewBox="0 0 24 24" className="w-[45%] h-[45%]" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <button
            ref={nextBtnRef}
            onClick={onNext}
            disabled={!onNext}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') { e.preventDefault(); playBtnRef?.current?.focus() }
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') onPlayKeyDown?.(e)
            }}
            className="flex-1 aspect-square rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-20 disabled:cursor-default flex items-center justify-center text-white transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-[45%] h-[45%]" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      </div>

      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
    </div>
  )
}
