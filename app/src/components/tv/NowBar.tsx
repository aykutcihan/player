import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, upcomingProgrammes, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props {
  channel: Channel
  visible: boolean
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export default function NowBar({ channel, visible }: Props) {
  const [current,  setCurrent]  = useState<Programme | null>(null)
  const [next,     setNext]     = useState<Programme | null>(null)
  const [tooltip,  setTooltip]  = useState<Programme | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) setShow(true)
    else {
      const t = setTimeout(() => setShow(false), 300)
      return () => clearTimeout(t)
    }
  }, [visible])

  useEffect(() => {
    if (!channel.tvgId) return
    fetchEpg(channel.tvgId).then(progs => {
      setCurrent(currentProgramme(progs))
      const upcoming = upcomingProgrammes(progs, 1)
      setNext(upcoming[0] ?? null)
    })
  }, [channel.tvgId])

  // Dışa tıklayınca tooltip kapat
  useEffect(() => {
    if (!tooltip) return
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltip(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [tooltip])

  if (!show) return null

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Gradient */}
      <div className="absolute inset-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      {/* İçerik */}
      <div className="relative flex items-center gap-3 px-4 pt-3 pb-6">
        {/* Kanal logosu */}
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-10 h-10 object-contain rounded bg-white/10 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-white/10 shrink-0 flex items-center justify-center">
            <span className="text-white/50 text-[10px]">{channel.name.slice(0,4)}</span>
          </div>
        )}

        {/* Şu an */}
        {current && (
          <div className="relative">
            <button
              onClick={() => setTooltip(tooltip?.title === current.title ? null : current)}
              className="flex flex-col items-start hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] text-red-400 font-medium">▶ ŞU AN</span>
              <span className="text-sm text-white font-medium leading-tight max-w-[200px] truncate">
                {current.title}
              </span>
              <span className="text-[10px] text-white/40">
                {fmtTime(current.start)} – {fmtTime(current.stop)}
              </span>
            </button>

            {/* Tooltip */}
            {tooltip?.title === current.title && (
              <div
                ref={tooltipRef}
                className="absolute top-full left-0 mt-2 w-72 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 shadow-xl z-30"
              >
                <div className="text-xs text-red-400 mb-1">▶ Şu an yayında</div>
                <div className="text-sm font-medium text-white mb-1">{current.title}</div>
                <div className="text-xs text-white/50 mb-2">
                  {fmtTime(current.start)} – {fmtTime(current.stop)}
                </div>
                {current.subTitle && (
                  <div className="text-xs text-white/60 italic mb-1">{current.subTitle}</div>
                )}
                {current.desc && (
                  <div className="text-xs text-white/50 leading-relaxed">{current.desc}</div>
                )}
                {current.category && (
                  <div className="text-[10px] text-white/30 mt-2">{current.category}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ayraç */}
        {current && next && (
          <div className="w-px h-8 bg-white/20 shrink-0" />
        )}

        {/* Sonraki */}
        {next && (
          <div className="relative">
            <button
              onClick={() => setTooltip(tooltip?.title === next.title ? null : next)}
              className="flex flex-col items-start hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] text-white/40 font-medium">SONRAKI</span>
              <span className="text-sm text-white/70 leading-tight max-w-[200px] truncate">
                {next.title}
              </span>
              <span className="text-[10px] text-white/30">{fmtTime(next.start)}</span>
            </button>

            {tooltip?.title === next.title && (
              <div
                ref={tooltipRef}
                className="absolute top-full left-0 mt-2 w-72 bg-[#1a1a1a] border border-white/10 rounded-lg p-3 shadow-xl z-30"
              >
                <div className="text-xs text-white/40 mb-1">Sonraki program</div>
                <div className="text-sm font-medium text-white mb-1">{next.title}</div>
                <div className="text-xs text-white/50 mb-2">
                  {fmtTime(next.start)} – {fmtTime(next.stop)}
                </div>
                {next.subTitle && (
                  <div className="text-xs text-white/60 italic mb-1">{next.subTitle}</div>
                )}
                {next.desc && (
                  <div className="text-xs text-white/50 leading-relaxed">{next.desc}</div>
                )}
                {next.category && (
                  <div className="text-[10px] text-white/30 mt-2">{next.category}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
