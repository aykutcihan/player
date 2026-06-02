import { useEffect, useRef, useState } from 'react'
import type { Channel } from '../../lib/m3u'

interface Props {
  channel: Channel
}

export default function RadioPlayer({ channel }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError]     = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setError(false)
    audio.src = channel.url
    audio.play().then(() => setPlaying(true)).catch(() => setError(true))
  }, [channel.url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => setError(true)); setPlaying(true) }
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
      {channel.logo
        ? <img src={channel.logo} alt="" className="w-32 h-32 rounded-full object-contain bg-white/10 p-2" />
        : <div className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center text-5xl">📻</div>
      }
      <div className="text-center">
        <div className="text-xl font-semibold">{channel.name}</div>
        <div className="text-sm text-white/40 mt-1">{channel.group}</div>
      </div>
      {error && <div className="text-red-400 text-sm">Stream yüklenemedi</div>}
      <button
        onClick={toggle}
        className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-2xl transition-colors"
      >
        {playing ? '⏸' : '▶'}
      </button>
      <audio ref={audioRef} onEnded={() => setPlaying(false)} />
    </div>
  )
}
