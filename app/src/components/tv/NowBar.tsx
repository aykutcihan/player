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

interface TooltipProps {
  prog:    Programme
  onClose: () => void
  label:   string
}

function ProgramTooltip({ prog, onClose, label }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-2 w-80 bg-[#111] border border-white/15 rounded-xl p-4 shadow-2xl z-30"
    >
      <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-base font-semibold text-white mb-1">{prog.title}</div>
      {prog.subTitle && (
        <div className="text-xs text-white/60 italic mb-2">{prog.subTitle}</div>
      )}
      <div className="text-xs text-white/50 mb-3">
        {fmtTime(prog.start)} – {fmtTime(prog.stop)}
      </div>
      {prog.desc ? (
        <div className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-3">
          {prog.desc}
        </div>
      ) : (
        <div className="text-xs text-white/20 italic border-t border-white/10 pt-3">
          Program açıklaması mevcut değil
        </div>
      )}
      {prog.category && (
        <div className="text-[10px] text-white/25 mt-3">{prog.category}</div>
      )}
    </div>
  )
}

export default function NowBar({ channel, visible }: Props) {
  const [current,      setCurrent]      = useState<Programme | null>(null)
  const [next,         setNext]         = useState<Programme | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<'current' | 'next' | null>(null)
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
    setCurrent(null)
    setNext(null)
    fetchEpg(channel.tvgId).then(progs => {
      setCurrent(currentProgramme(progs))
      setNext(upcomingProgrammes(progs, 1)[0] ?? null)
    })
  }, [channel.tvgId])

  if (!show) return null

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      <div className="relative flex items-start gap-3 px-4 pt-3 pb-6">
        {/* Logo */}
        {channel.logo ? (
          <img src={channel.logo} alt={channel.name}
            className="w-10 h-10 object-contain rounded bg-white/10 shrink-0 mt-1" />
        ) : (
          <div className="w-10 h-10 rounded bg-white/10 shrink-0 mt-1 flex items-center justify-center">
            <span className="text-white/50 text-[9px]">{channel.name.slice(0,4)}</span>
          </div>
        )}

        {/* Şu an */}
        {current && (
          <div className="relative">
            <button
              onClick={() => setActiveTooltip(activeTooltip === 'current' ? null : 'current')}
              className="flex flex-col items-start text-left hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] text-red-400 font-medium">▶ ŞU AN</span>
              <span className="text-sm text-white font-medium leading-tight max-w-[200px] truncate">
                {current.title}
              </span>
              <span className="text-[10px] text-white/40">
                {fmtTime(current.start)} – {fmtTime(current.stop)}
              </span>
            </button>
            {activeTooltip === 'current' && (
              <ProgramTooltip
                prog={current}
                label="Şu an yayında"
                onClose={() => setActiveTooltip(null)}
              />
            )}
          </div>
        )}

        {/* Ayraç */}
        {current && next && <div className="w-px h-8 bg-white/20 shrink-0 mt-2" />}

        {/* Sonraki */}
        {next && (
          <div className="relative">
            <button
              onClick={() => setActiveTooltip(activeTooltip === 'next' ? null : 'next')}
              className="flex flex-col items-start text-left hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] text-white/40 font-medium">SONRAKI</span>
              <span className="text-sm text-white/70 leading-tight max-w-[200px] truncate">
                {next.title}
              </span>
              <span className="text-[10px] text-white/30">{fmtTime(next.start)}</span>
            </button>
            {activeTooltip === 'next' && (
              <ProgramTooltip
                prog={next}
                label="Sonraki program"
                onClose={() => setActiveTooltip(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
