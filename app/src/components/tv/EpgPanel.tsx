import { useEffect, useState } from 'react'
import { fetchEpg, currentProgramme, upcomingProgrammes, type Programme } from '../../lib/epg'

interface Props {
  channelId: string
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export default function EpgPanel({ channelId }: Props) {
  const [current, setCurrent]   = useState<Programme | null>(null)
  const [upcoming, setUpcoming] = useState<Programme[]>([])

  useEffect(() => {
    if (!channelId) return
    fetchEpg(channelId).then(progs => {
      setCurrent(currentProgramme(progs))
      setUpcoming(upcomingProgrammes(progs, 8))
    })
  }, [channelId])

  if (!current && upcoming.length === 0) {
    return <p className="text-white/30 text-xs p-4">EPG bilgisi yok</p>
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      {current && (
        <div className="bg-red-900/30 rounded p-3 border border-red-500/30">
          <div className="text-xs text-red-400 mb-1">▶ Şu an</div>
          <div className="text-sm font-medium text-white">{current.title}</div>
          <div className="text-xs text-white/50 mt-1">
            {fmtTime(current.start)} – {fmtTime(current.stop)}
          </div>
          {current.desc && (
            <div className="text-xs text-white/40 mt-2 line-clamp-3">{current.desc}</div>
          )}
        </div>
      )}
      <div className="text-xs text-white/40 font-medium px-1 mt-1">Sıradakiler</div>
      {upcoming.map((p, i) => (
        <div key={i} className="rounded p-2 bg-white/5 border border-white/5">
          <div className="text-xs text-white/50">{fmtTime(p.start)}</div>
          <div className="text-sm text-white/80">{p.title}</div>
        </div>
      ))}
    </div>
  )
}
