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
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 w-72 bg-[#111] border border-white/15 rounded-xl p-4 shadow-2xl z-50">
      <div className="text-sm font-semibold text-white mb-1">{prog.title}</div>
      <div className="text-xs text-white/50 mb-2">{fmtTime(prog.start)} – {fmtTime(prog.stop)}</div>
      {prog.desc
        ? <div className="text-xs text-white/60 leading-relaxed border-t border-white/10 pt-2">{prog.desc}</div>
        : <div className="text-xs text-white/25 italic border-t border-white/10 pt-2">Açıklama yok</div>}
    </div>
  )
}

export default function NowBar({ channel, visible }: Props) {
  const [past,     setPast]     = useState<Programme[]>([])
  const [current,  setCurrent]  = useState<Programme | null>(null)
  const [upcoming, setUpcoming] = useState<Programme[]>([])
  const [detail,   setDetail]   = useState<Programme | null>(null)
  const [show,     setShow]     = useState(false)

  const scrollRef   = useRef<HTMLDivElement>(null)
  const anchorRef   = useRef<HTMLDivElement>(null)
  const dragStart   = useRef({ x: 0, sl: 0, moved: false })
  const dragging    = useRef(false)

  useEffect(() => {
    if (visible) setShow(true)
    else { const t = setTimeout(() => setShow(false), 300); return () => clearTimeout(t) }
  }, [visible])

  useEffect(() => {
    if (!channel.tvgId) return
    fetchEpg(channel.tvgId).then(all => {
      setPast(pastProgrammes(all, 8).reverse())
      setCurrent(currentProgramme(all))
      setUpcoming(upcomingProgrammes(all, 8))
    })
  }, [channel.tvgId])

  // Şu anki program logonun hemen yanına — her kanal değişince sıfırla
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    // Önce sıfırla, ardından anchor pozisyonuna git
    container.scrollLeft = 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const anchor = anchorRef.current
        if (anchor && container) {
          container.scrollLeft = anchor.offsetLeft
        }
      })
    })
  }, [channel.tvgId, current])

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    dragStart.current = { x: e.clientX, sl: scrollRef.current?.scrollLeft ?? 0, moved: false }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !scrollRef.current) return
    const dx = e.clientX - dragStart.current.x
    if (Math.abs(dx) > 3) dragStart.current.moved = true
    scrollRef.current.scrollLeft = dragStart.current.sl - dx
  }
  const onMouseUp = () => { dragging.current = false }

  const handleClick = (prog: Programme) => {
    if (dragStart.current.moved) return
    setDetail(d => d?.start === prog.start ? null : prog)
  }

  const cardClass = (type: 'past' | 'current' | 'future') => {
    const base = 'flex-none flex flex-col justify-center px-3 py-2 rounded-lg border cursor-pointer transition-colors'
    if (type === 'current') return `${base} bg-red-900/50 border-red-500/60 min-w-[160px]`
    if (type === 'past')    return `${base} bg-slate-800/60 border-slate-600/30 hover:bg-slate-700/60 min-w-[130px]`
    return `${base} bg-indigo-950/50 border-indigo-700/30 hover:bg-indigo-900/50 min-w-[130px]`
  }

  if (!show) return null

  const allProgs = [
    ...past.map(p => ({ p, type: 'past' as const })),
    ...(current ? [{ p: current, type: 'current' as const }] : []),
    ...upcoming.map(p => ({ p, type: 'future' as const })),
  ]

  return (
    <div className={`absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

      <div className="relative flex items-center pt-3 px-3 gap-3">
        {/* Logo — sabit */}
        <div className="shrink-0 z-10">
          {channel.logo
            ? <img src={channel.logo} alt="" className="w-10 h-10 object-contain rounded bg-white/10" />
            : <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center">
                <span className="text-white/40 text-[9px]">{channel.name.slice(0,4)}</span>
              </div>}
        </div>

        {/* Scrollable program şeridi */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-black/60 to-transparent z-10 pointer-events-none" />

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto select-none"
            style={{ scrollbarWidth: 'none', height: 64, cursor: dragging.current ? 'grabbing' : 'grab' }}
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
                className="relative shrink-0"
                style={{ height: 64 }}
                onClick={() => handleClick(p)}
              >
                <div className={cardClass(type)} style={{ height: 56 }}>
                  {type === 'current' && <div className="text-[9px] text-red-400 font-semibold mb-0.5">▶ ŞU AN</div>}
                  {type === 'past'    && <div className="text-[9px] text-slate-400 mb-0.5">geçmiş</div>}
                  <div className={`font-medium leading-tight truncate ${
                    type === 'current' ? 'text-white text-xs max-w-[150px]'
                    : type === 'past'  ? 'text-slate-300 text-[11px] max-w-[120px]'
                    : 'text-indigo-200 text-[11px] max-w-[120px]'
                  }`}>{p.title}</div>
                  <div className="text-[9px] text-white/40 mt-0.5">{fmtTime(p.start)}–{fmtTime(p.stop)}</div>
                </div>
                {detail?.start === p.start && (
                  <Detail prog={p} onClose={() => setDetail(null)} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
