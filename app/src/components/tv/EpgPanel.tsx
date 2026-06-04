import { useEffect, useState } from 'react'
import {
  fetchEpg, currentProgramme, upcomingProgrammes, pastProgrammes,
  isDvrStream, type Programme
} from '../../lib/epg'

interface Props {
  channelId:     string
  streamUrl?:    string
  onSelectPast?: (prog: Programme) => void
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export default function EpgPanel({ channelId, streamUrl = '', onSelectPast }: Props) {
  const [current,  setCurrent]  = useState<Programme | null>(null)
  const [upcoming, setUpcoming] = useState<Programme[]>([])
  const [past,     setPast]     = useState<Programme[]>([])
  const dvr = isDvrStream(streamUrl)

  useEffect(() => {
    if (!channelId) return
    fetchEpg(channelId).then(progs => {
      setCurrent(currentProgramme(progs))
      setUpcoming(upcomingProgrammes(progs, 8))
      setPast(pastProgrammes(progs, 8))
    })
  }, [channelId])

  if (!current && upcoming.length === 0 && past.length === 0) {
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

      {upcoming.length > 0 && (
        <>
          <div className="text-xs text-white/40 font-medium px-1 mt-1">Sıradakiler</div>
          {upcoming.map((p, i) => (
            <div key={i} className="rounded p-2 bg-white/5 border border-white/5">
              <div className="text-xs text-white/50">{fmtTime(p.start)}</div>
              <div className="text-sm text-white/80">{p.title}</div>
            </div>
          ))}
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="text-xs text-white/40 font-medium px-1 mt-2 flex items-center gap-1">
            Geçmiş
            {dvr && <span className="text-green-500/70 text-[10px]">⏪ DVR</span>}
          </div>
          {past.map((p, i) => (
            <div
              key={i}
              onClick={() => dvr && onSelectPast?.(p)}
              className={`rounded p-2 border border-white/5 transition-colors ${
                dvr
                  ? 'bg-white/5 cursor-pointer hover:bg-white/10 hover:border-white/20'
                  : 'bg-black/20 opacity-40 cursor-default'
              }`}
            >
              <div className="text-xs text-white/40">{fmtTime(p.start)} – {fmtTime(p.stop)}</div>
              <div className="text-sm text-white/60">{p.title}</div>
              {dvr && <div className="text-[10px] text-green-500/50 mt-0.5">⏪ tıkla geri sar</div>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
