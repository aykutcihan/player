import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'
import { fetchAllNowPlaying, type NowPlaying } from '../../lib/nowplaying'
import { fetchEpg, currentProgramme, type Programme } from '../../lib/epg'
import { fetchPowerNowPlaying, fetchKarnavalNowPlaying, fetchShowNowPlaying, fetchOzgurNowPlaying, fetchFenomenNowPlaying, fetchVivaNowPlaying, fetchRadyo7NowPlaying, fetchRadyohomeNowPlaying } from '../../lib/powerplaying'

interface Props {
  channel: Channel
  onPrev?: () => void
  onNext?: () => void
}

export default function RadioPlayer({ channel, onPrev, onNext }: Props) {
  const audioRef              = useRef<HTMLAudioElement>(null)
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

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">

      {/* Blurred cover background */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          backgroundImage: cover ? `url(${cover})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(60px)',
          transform: 'scale(1.3)',
          opacity: cover ? 0.4 : 0,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#111]/40 via-transparent to-[#111]/90" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8 pt-24 pb-4 flex-1 min-h-0">
        {/* Cover art */}
        <div className="relative shrink-0">
          {cover
            ? <img src={cover} alt="" className="max-h-24 max-w-[220px] w-auto h-auto object-contain rounded-xl shadow-2xl" />
            : <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-4xl">📻</div>
          }
          {playing && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse ring-2 ring-[#111]" />
          )}
        </div>

        {/* Channel info */}
        <div className="text-center">
          <div className="text-xl font-bold">{channel.name}</div>
          <div className="text-xs text-white/40 mt-0.5">{channel.group}</div>
        </div>

        {/* Song info */}
        {song && (song.title || song.artist) && (
          <div className="w-full text-center bg-black/30 backdrop-blur-md rounded-2xl px-5 py-3.5 border border-white/8">
            {song.title && <div className="text-sm font-semibold text-white truncate">{song.title}</div>}
            {song.artist && <div className="text-xs text-white/50 mt-0.5 truncate">{song.artist}</div>}
            {(song.duration ?? 0) > 0 && (
              <div className="mt-2.5 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((song.progress ?? 0) / (song.duration ?? 1)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* TRT program */}
        {program && (
          <div className="w-full text-center bg-black/30 backdrop-blur-md rounded-2xl px-5 py-3.5 border border-white/8">
            <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1">Şu an yayında</div>
            <div className="text-sm font-semibold text-white truncate">{program.title}</div>
            {program.desc && <div className="text-xs text-white/35 mt-1 line-clamp-2">{program.desc}</div>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-2 py-5 shrink-0">
        {error && <div className="text-red-400 text-xs">Stream yüklenemedi</div>}
        <div className="flex items-center gap-5">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-20 disabled:cursor-default flex items-center justify-center text-white text-lg transition-all active:scale-95"
          >
            ◀
          </button>
          <button
            onClick={toggle}
            className="w-16 h-16 rounded-full bg-white hover:bg-white/90 active:scale-95 flex items-center justify-center text-2xl text-black transition-all shadow-2xl"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
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
