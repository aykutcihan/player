import { useEffect, useRef, useState } from 'react'
import { fetchEpg, currentProgramme, pastProgrammes, upcomingProgrammes, type Programme } from '../../lib/epg'
import type { Channel } from '../../lib/m3u'

interface Props { channel: Channel; visible: boolean }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function Detail({ prog, onClose }: { prog: Programme; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    // bir tick bekle ki açan click'i yakalamamalı
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h) }
  }, [onClose])

  return (
    <div ref={ref}
      className="absolute top-full left-0 mt-2 w-72 bg-[#111] border border-white/15 rounded-xl p-4 shadow-2xl z-50"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="text-sm font-semibold text-white mb-1">{prog.title}</div>
      <div className="text-xs text-white/50 mb-2">{fmtTime(prog.start)} – {fmtTime(prog.stop)}</div>
      {prog.desc
        ? <div className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2">{prog.desc}</div>
        : <div className="text-xs text-white/25 italic border-t border-white/10 pt-2">Açıklama yok</div>}
      {prog.category && <div className="text-[10px] text-white/25 mt-2">{prog.category}</div>}
    </div>
  )
}

function ProgramCard({
  prog, type, isOpen, onToggle
}: {
  prog: Programme
  type: 'past' | 'current' | 'future'
  isOpen: boolean
  onToggle: () => void
}) {
  const bg = type === 'current'
    ? 'bg-red-900/50 border-red-500/60'
    : type === 'past'
    ? 'bg-slate-800/60 border-slate-600/30 hover:bg-slate-700/60'
    : 'bg-indigo-950/50 border-indigo-700/30 hover:bg-indigo-900/50'

  return (
    <div
      className="relative shrink-0"
      style={{ height: 64 }}
      onClick={onToggle}
    >
      <div
        className={`flex flex-col justify-center px-3 rounded-lg border cursor-pointer ${bg} ${
          type === 'current' ? 'min-w-[160px]' : 'min-w-[130px]'
        }`}
        style={{ height: 56, marginTop: 4 }}
      >
        {type === 'current' && <div className="text-[9px] text-red-400 font-semibold mb-0.5">▶ ŞU AN</div>}
        {type === 'past'    && <div className="text-[9px] text-slate-400 mb-0.5">geçmiş</div>}
        <div className={`font-medium leading-tight truncate ${
          type === 'current' ? 'text-white text-xs max-w-[150px]'
          : type === 'past'  ? 'text-slate-300 text-[11px] max-w-[120px]'
          : 'text-indigo-200 text-[11px] max-w-[120px]'
        }`}>{prog.title}</div>
        <div className="text-[9px] text-white/40 mt-0.5">{fmtTime(prog.start)}–{fmtTime(prog.stop)}</div>
      </div>
      {isOpen && <Detail prog={prog} onClose={onToggle} />}
    </div>
  )
}

export default function NowBar({ channel, visible }: Props) {
  const [past,     setPast]     = useState<Programme[]>([])
  const [current,  setCurrent]  = useState<Programme | null>(null)
  const [upcoming, setUpcoming] = useState<Programme[]>([])
  const [openKey,  setOpenKey]  = useState<string | null>(null)
  const [show,     setShow]     = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const drag      = useRef({ x: 0, sl: 0, active: false })

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
    setPast([]); setCurrent(null); setUpcoming([]); setOpenKey(null)
  }, [channel.tvgId])

  useEffect(() => {
    if (!channel.tvgId) return
    fetchEpg(channel.tvgId).then(all => {
      setPast(pastProgrammes(all, 8).reverse())
      setCurrent(currentProgramme(all))
      setUpcoming(upcomingProgrammes(all, 8))
    })
  }, [channel.tvgId])

  useEffect(() => {
    if (!current || !show) return
    const t = setTimeout(() => {
      const container = scrollRef.current
      const anchor    = anchorRef.current
      if (!container || !anchor) return
      const cRect = container.getBoundingClientRect()
      const aRect = anchor.getBoundingClientRect()
      container.scrollLeft += aRect.left - cRect.left
    }, 50)
    return () => clearTimeout(t)
  }, [current, show])

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, sl: scrollRef.current?.scrollLeft ?? 0, active: true }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.active || !scrollRef.current) return
    scrollRef.current.scrollLeft = drag.current.sl - (e.clientX - drag.current.x)
  }
  const onMouseUp = () => { drag.current.active = false }

  const allProgs: { p: Programme; type: 'past' | 'current' | 'future' }[] = [
    ...past.map(p => ({ p, type: 'past' as const })),
    ...(current ? [{ p: current, type: 'current' as const }] : []),
    ...upcoming.map(p => ({ p, type: 'future' as const })),
  ]

  if (!show) return null

  return (
    <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      <div className="relative flex items-center pt-3 px-3 gap-3">
        {/* Logo */}
        <div className="shrink-0 z-10">
          {channel.logo
            ? <img src={channel.logo} alt="" className="w-10 h-10 object-contain rounded bg-white/10" />
            : <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                <span className="text-white/40 text-[9px]">{channel.name.slice(0,4)}</span>
              </div>}
        </div>

        {/* Şerit */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none', height: 68, cursor: 'grab' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={e => { e.preventDefault(); if (scrollRef.current) scrollRef.current.scrollLeft += e.deltaY }}
          >
            {allProgs.map(({ p, type }, i) => (
              <div
                key={i}
                ref={type === 'current' ? anchorRef : undefined}
              >
                <ProgramCard
                  prog={p}
                  type={type}
                  isOpen={openKey === p.start}
                  onToggle={() => setOpenKey(k => k === p.start ? null : p.start)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
