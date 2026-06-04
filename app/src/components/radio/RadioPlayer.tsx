import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'
import { fetchAllNowPlaying, type NowPlaying } from '../../lib/nowplaying'
import { fetchEpg, currentProgramme, type Programme } from '../../lib/epg'
import { fetchPowerNowPlaying } from '../../lib/powerplaying'

interface Props {
  channel: Channel
}

export default function RadioPlayer({ channel }: Props) {
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

  // Power kanalları için anlık şarkı bilgisi
  useEffect(() => {
    if (!channel.tvgId.startsWith('powerapp.')) return
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      const info = await fetchPowerNowPlaying(channel.tvgId)
      if (info) setSong(info)
      timer = setTimeout(refresh, 30000)
    }
    refresh()
    return () => clearTimeout(timer)
  }, [channel.tvgId])

  // Şarkı bilgisi — Karnaval ve Number1 kanallar için
  useEffect(() => {
    const isSupported = channel.tvgId.startsWith('karnaval.') || channel.tvgId.startsWith('number1.')
    if (!isSupported) {
      if (!channel.tvgId.startsWith('powerapp.')) setSong(null)
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
    <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
      {/* Kapak */}
      <div className="relative">
        {cover
          ? <img src={cover} alt="" className="w-48 h-48 rounded-2xl object-cover shadow-2xl" />
          : <div className="w-48 h-48 rounded-2xl bg-white/10 flex items-center justify-center text-6xl">📻</div>
        }
        {playing && (
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Kanal adı */}
      <div className="text-center">
        <div className="text-xl font-semibold">{channel.name}</div>
        <div className="text-sm text-white/40 mt-0.5">{channel.group}</div>
      </div>

      {/* Şarkı bilgisi */}
      {song && (song.title || song.artist) && (
        <div className="text-center bg-white/5 rounded-xl px-6 py-3 w-full">
          {song.title && <div className="text-base font-medium text-white truncate">{song.title}</div>}
          {song.artist && <div className="text-sm text-white/50 mt-0.5 truncate">{song.artist}</div>}
          {(song.duration ?? 0) > 0 && (
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((song.progress ?? 0) / (song.duration ?? 1)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* TRT radyo program bilgisi */}
      {program && (
        <div className="text-center bg-white/5 rounded-xl px-6 py-3 w-full">
          <div className="text-[10px] text-white/40 mb-1">🎙 Şu an yayında</div>
          <div className="text-base font-medium text-white truncate">{program.title}</div>
          {program.desc && (
            <div className="text-xs text-white/40 mt-1 line-clamp-2">{program.desc}</div>
          )}
        </div>
      )}

      {error && <div className="text-red-400 text-sm">Stream yüklenemedi</div>}

      {/* Play/Pause */}
      <button
        onClick={toggle}
        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-2xl transition-colors shadow-lg"
      >
        {playing ? '⏸' : '▶'}
      </button>

      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
    </div>
  )
}
