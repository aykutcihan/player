import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'
import { fetchAllNowPlaying, type NowPlaying } from '../../lib/nowplaying'
import { fetchEpg, currentProgramme, type Programme } from '../../lib/epg'
import { fetchPowerNowPlaying, fetchKarnavalNowPlaying, fetchShowNowPlaying, fetchOzgurNowPlaying, fetchFenomenNowPlaying, fetchVivaNowPlaying, fetchRadyo7NowPlaying, fetchRadyohomeNowPlaying } from '../../lib/powerplaying'

function MarqueeText({ text, className }: { text: string; className?: string }) {
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

  const dur = shift > 0 ? Math.max(4, shift / 30) : 0  // ~30px/s

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
  playBtnRef?: React.RefObject<HTMLButtonElement | null>
  onPlayKeyDown?: (e: React.KeyboardEvent) => void
  onCoverChange?: (url: string) => void
}

export default function RadioPlayer({ channel, onPrev, onNext, playBtnRef, onPlayKeyDown, onCoverChange }: Props) {
  const audioRef    = useRef<HTMLAudioElement>(null)
  const prevBtnRef  = useRef<HTMLButtonElement>(null)
  const nextBtnRef  = useRef<HTMLButtonElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [error, setError]       = useState(false)
  const [song, setSong]         = useState<NowPlaying | null>(null)
  const [program, setProgram]   = useState<Programme | null>(null)

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
    fetchEpg(channel.tvgId).then(progs => {
      setProgram(currentProgramme(progs))
    })
    const t = setInterval(() => {
      fetchEpg(channel.tvgId).then(progs => setProgram(currentProgramme(progs)))
    }, 60000)
    return () => clearInterval(t)
  }, [channel.tvgId])

  // Power, Karnaval ve Show kanalları için anlık şarkı (Cloudflare Worker)
  useEffect(() => {
    const isPower    = channel.tvgId.startsWith('powerapp.')
    const isKarnaval = channel.tvgId.startsWith('karnaval.')
    const isShow     = channel.tvgId.startsWith('show.')
    const isOzgur    = channel.tvgId.startsWith('ozgur.')
    const isFenomen  = channel.tvgId.startsWith('fenomen.')
    const isViva     = channel.tvgId.startsWith('viva.')
    const isRadyo7      = channel.tvgId.startsWith('radyo7.')
    const isRadyohome   = channel.tvgId.startsWith('radyohome.')
    if (!isPower && !isKarnaval && !isShow && !isOzgur && !isFenomen && !isViva && !isRadyo7 && !isRadyohome) return
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      let info = null
      if (isPower)          info = await fetchPowerNowPlaying(channel.tvgId)
      else if (isKarnaval)  info = await fetchKarnavalNowPlaying(channel.tvgId)
      else if (isShow)      info = await fetchShowNowPlaying(channel.tvgId)
      else if (isOzgur)     info = await fetchOzgurNowPlaying(channel.tvgId)
      else if (isFenomen)   info = await fetchFenomenNowPlaying(channel.tvgId)
      else if (isViva)      info = await fetchVivaNowPlaying(channel.tvgId)
      else if (isRadyo7)      info = await fetchRadyo7NowPlaying(channel.tvgId)
      else if (isRadyohome)   info = await fetchRadyohomeNowPlaying(channel.tvgId)
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
      const isWorker = channel.tvgId.startsWith('powerapp.') || channel.tvgId.startsWith('karnaval.') || channel.tvgId.startsWith('show.') || channel.tvgId.startsWith('ozgur.') || channel.tvgId.startsWith('fenomen.') || channel.tvgId.startsWith('viva.') || channel.tvgId.startsWith('radyo7.') || channel.tvgId.startsWith('radyohome.')
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

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => setError(true)); setPlaying(true) }
  }

  const cover = song?.cover || channel.logo || ''

  useEffect(() => { onCoverChange?.(cover) }, [cover])

  return (
    <div className="relative flex flex-col h-full w-full">

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8 pt-4 pb-2 flex-1 min-h-0">
        {/* Song info */}
        {song && (song.title || song.artist) && (
          <div className="w-full text-center px-4 mt-2">
            {song.title && <MarqueeText text={song.title} className="text-2xl font-bold text-white leading-tight drop-shadow-lg" />}
            {song.artist && <div className="text-base text-white/60 mt-2 font-medium">{song.artist}</div>}
            {(song.duration ?? 0) > 0 && (
              <div className="mt-4 h-1 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-pink-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((song.progress ?? 0) / (song.duration ?? 1)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* TRT program */}
        {program && (
          <div className="w-full text-center px-4 mt-2">
            <MarqueeText text={program.title} className="text-2xl font-bold text-white leading-tight drop-shadow-lg" />
            {program.desc && <div className="text-base text-white/60 mt-2 font-medium line-clamp-2">{program.desc}</div>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-2 py-3 shrink-0">
        {error && <div className="text-red-400 text-xs">Stream yüklenemedi</div>}
        <div className="flex items-center gap-5">
          <button
            ref={prevBtnRef}
            onClick={onPrev}
            disabled={!onPrev}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') { e.preventDefault(); playBtnRef?.current?.focus() }
            }}
            className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-20 disabled:cursor-default flex items-center justify-center text-white text-lg transition-all active:scale-95"
          >
            ◀
          </button>
          <button
            ref={playBtnRef}
            onClick={toggle}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtnRef.current?.focus() }
              if (e.key === 'ArrowRight') { e.preventDefault(); nextBtnRef.current?.focus() }
              else onPlayKeyDown?.(e)
            }}
            className="w-16 h-16 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-2xl text-white transition-all"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            ref={nextBtnRef}
            onClick={onNext}
            disabled={!onNext}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') { e.preventDefault(); playBtnRef?.current?.focus() }
            }}
            className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-20 disabled:cursor-default flex items-center justify-center text-white text-lg transition-all active:scale-95"
          >
            ▶
          </button>
        </div>
      </div>

      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
    </div>
  )
}
