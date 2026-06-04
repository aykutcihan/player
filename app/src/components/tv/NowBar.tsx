import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, pastProgrammes, upcomingProgrammes, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props { channel: Channel; visible: boolean }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// Sabit kutu tanımları — değişmez, sadece içi dolar
const BOX_DEFS = [
  { id: 'past-2',   type: 'past',    label: ''       },
  { id: 'past-1',   type: 'past',    label: ''       },
  { id: 'current',  type: 'current', label: '▶ ŞU AN' },
  { id: 'next-1',   type: 'future',  label: ''       },
  { id: 'next-2',   type: 'future',  label: ''       },
] as const

type BoxType = 'past' | 'current' | 'future'

interface BoxData { prog: Programme | null; type: BoxType; label: string; id: string }

function ProgramBox({ data, isOpen, onToggle }: {
  data:     BoxData
  isOpen:   boolean
  onToggle: () => void
}) {
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const h = (e: MouseEvent) => {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) onToggle()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [isOpen, onToggle])

  const bg = data.type === 'current'
    ? 'bg-red-900/50 border-red-500/60'
    : data.type === 'past'
    ? 'bg-slate-800/60 border-slate-600/30'
    : 'bg-indigo-950/50 border-indigo-700/30'

  const textColor = data.type === 'current' ? 'text-white'
    : data.type === 'past' ? 'text-slate-300'
    : 'text-indigo-200'

  const w = data.type === 'current' ? 'w-44' : 'w-32'

  return (
    <div className={`relative shrink-0 ${w}`} style={{ height: 60 }}>
      {/* Kutu */}
      <div
        className={`absolute inset-0 rounded-lg border ${bg} flex flex-col justify-center px-3 ${
          data.prog ? 'cursor-pointer hover:brightness-125' : 'opacity-20'
        } transition-all`}
        onClick={() => data.prog && onToggle()}
      >
        {data.label && (
          <div className="text-[9px] text-red-400 font-semibold mb-0.5">{data.label}</div>
        )}
        {data.prog ? (
          <>
            <div className={`font-medium text-xs leading-tight truncate ${textColor}`}>
              {data.prog.title}
            </div>
            <div className="text-[9px] text-white/40 mt-0.5">
              {fmtTime(data.prog.start)}–{fmtTime(data.prog.stop)}
            </div>
          </>
        ) : (
          <div className="text-[9px] text-white/20">—</div>
        )}
      </div>

      {/* Detay popup */}
      {isOpen && data.prog && (
        <div
          ref={detailRef}
          className="absolute top-full left-0 mt-2 w-72 bg-[#111] border border-white/15 rounded-xl p-4 shadow-2xl z-50"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="text-sm font-semibold text-white mb-1">{data.prog.title}</div>
          <div className="text-xs text-white/50 mb-2">
            {fmtTime(data.prog.start)} – {fmtTime(data.prog.stop)}
          </div>
          {data.prog.desc
            ? <div className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2">{data.prog.desc}</div>
            : <div className="text-xs text-white/25 italic border-t border-white/10 pt-2">Açıklama mevcut değil</div>
          }
          {data.prog.category && (
            <div className="text-[10px] text-white/25 mt-2">{data.prog.category}</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function NowBar({ channel, visible }: Props) {
  const [boxes,   setBoxes]   = useState<BoxData[]>(() =>
    BOX_DEFS.map(b => ({ ...b, prog: null }))
  )
  const [openId,  setOpenId]  = useState<string | null>(null)
  const [show,    setShow]    = useState(false)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    // Kanal değişince kutuları sıfırla
    setBoxes(BOX_DEFS.map(b => ({ ...b, prog: null })))
    setOpenId(null)
    if (!channel.tvgId) return

    fetchEpg(channel.tvgId).then(all => {
      const past     = pastProgrammes(all, 2).reverse()  // en yeni 2 geçmiş
      const current  = currentProgramme(all)
      const upcoming = upcomingProgrammes(all, 2)

      setBoxes([
        { ...BOX_DEFS[0], prog: past[1] ?? null },      // past-2
        { ...BOX_DEFS[1], prog: past[0] ?? null },      // past-1
        { ...BOX_DEFS[2], prog: current ?? null },       // current
        { ...BOX_DEFS[3], prog: upcoming[0] ?? null },   // next-1
        { ...BOX_DEFS[4], prog: upcoming[1] ?? null },   // next-2
      ])
    })
  }, [channel.tvgId])

  if (!show) return null

  return (
    <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${
      visible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      <div className="relative flex items-center pt-3 px-3 gap-2">
        {/* Logo */}
        <div className="shrink-0">
          {channel.logo
            ? <img src={channel.logo} alt="" className="w-10 h-10 object-contain rounded bg-white/10" />
            : <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                <span className="text-white/40 text-[9px]">{channel.name.slice(0,4)}</span>
              </div>
          }
        </div>

        {/* 5 sabit kutu */}
        {boxes.map(box => (
          <ProgramBox
            key={box.id}
            data={box}
            isOpen={openId === box.id}
            onToggle={() => setOpenId(id => id === box.id ? null : box.id)}
          />
        ))}
      </div>
    </div>
  )
}
